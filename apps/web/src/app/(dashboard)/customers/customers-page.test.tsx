/**
 * @vitest-environment jsdom
 *
 * Regression tests for branch-aware customer creation.
 * Verifies that:
 *   1. Customer POST includes activeBranchId from auth context.
 *   2. Register button is disabled when no active branch is selected.
 *   3. API errors surface via toast.error.
 *   4. Successful creation invalidates the customer list query.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Hoisted mocks — variables defined here are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockPost, mockGet, mockToastSuccess, mockToastError, mockInvalidateQueries } =
  vi.hoisted(() => ({
    mockPost: vi.fn(),
    // Return { data: [] } for list queries and { data: null } for detail queries
    // so the detail panel never tries to render undefined customer data.
    mockGet: vi.fn().mockImplementation((url: string) => {
      if (url && url.match(/\/customers\/[^/]+$/)) {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: [] });
    }),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockInvalidateQueries: vi.fn(),
  }));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: mockPost,
    get: mockGet,
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
  Toaster: () => null,
}));

const branchAId = "11111111-1111-1111-1111-111111111111";
let mockActiveBranchId: string | null = branchAId;

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      role: "FRONT_DESK",
      branches: [{ id: branchAId, name: "Branch A" }],
    },
    get activeBranchId() {
      return mockActiveBranchId;
    },
    setActiveBranchId: vi.fn(),
    loading: false,
    logout: vi.fn(),
    checkSession: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import subject under test AFTER mocks are declared
// ---------------------------------------------------------------------------
import CustomersPage from "./page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CustomersPage />
    </QueryClientProvider>,
  );
}

async function openCreateDialog() {
  const addBtn = screen.getByRole("button", { name: /add customer/i });
  await userEvent.click(addBtn);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CustomersPage — branch-aware customer creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBranchId = branchAId;
    mockGet.mockImplementation((url: string) => {
      if (url && url.match(/\/customers\/[^/]+$/)) {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("injects activeBranchId into the POST /customers payload", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "new-customer-id" } });

    renderPage();
    await openCreateDialog();

    await userEvent.type(
      screen.getByPlaceholderText("e.g. John Doe"),
      "Test Customer",
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. +15551122"),
      "+919876543210",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /register/i }),
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/customers",
        expect.objectContaining({
          fullName: "Test Customer",
          phone: "+919876543210",
          branchId: branchAId,
        }),
      );
    });
  });

  it("disables the Register button when activeBranchId is null", async () => {
    mockActiveBranchId = null;

    renderPage();
    await openCreateDialog();

    const registerBtn = screen.getByRole("button", { name: /register/i });
    expect(registerBtn).toBeDisabled();
  });

  it("enables the Register button when activeBranchId is set", async () => {
    renderPage();
    await openCreateDialog();

    const registerBtn = screen.getByRole("button", { name: /register/i });
    expect(registerBtn).not.toBeDisabled();
  });

  it("surfaces API errors via toast.error", async () => {
    mockPost.mockRejectedValueOnce(
      new Error("Phone number already registered."),
    );

    renderPage();
    await openCreateDialog();

    await userEvent.type(
      screen.getByPlaceholderText("e.g. John Doe"),
      "Duplicate Customer",
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. +15551122"),
      "+919876543210",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /register/i }),
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Phone number already registered.",
      );
    });
  });

  it("shows success toast and invalidates customer list on successful creation", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "new-customer-id" } });

    renderPage();
    await openCreateDialog();

    await userEvent.type(
      screen.getByPlaceholderText("e.g. John Doe"),
      "New Customer",
    );
    await userEvent.type(
      screen.getByPlaceholderText("e.g. +15551122"),
      "+910000000001",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /register/i }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Customer registered successfully!",
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["customers"],
      });
    });
  });
});
