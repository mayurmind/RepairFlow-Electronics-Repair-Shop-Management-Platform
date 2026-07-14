import { ForbiddenException } from "@nestjs/common";
import { BranchAccessGuard } from "./branch.guard";

describe("BranchAccessGuard", () => {
  let guard: BranchAccessGuard;
  let mockPrismaService: any;
  let mockContext: any;
  let mockRequest: any;

  beforeEach(() => {
    mockPrismaService = {
      repairTicket: { findUnique: jest.fn() },
      estimate: { findUnique: jest.fn() },
      invoice: { findUnique: jest.fn() },
      attachment: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    guard = new BranchAccessGuard(mockPrismaService as any);

    mockRequest = {
      url: "",
      method: "GET",
      user: {
        role: "TECHNICIAN",
        branches: [{ id: "branch-1" }],
      },
      params: {},
      query: {},
      body: {},
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
    };
  });

  it("should allow SYSTEM_ADMIN without branch check", async () => {
    mockRequest.user.role = "SYSTEM_ADMIN";
    mockRequest.params.branchId = "some-other-branch";
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should block access if user does not belong to explicit param branchId", async () => {
    mockRequest.params.branchId = "unassigned-branch";
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should allow access if user belongs to explicit param branchId", async () => {
    mockRequest.params.branchId = "branch-1";
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should fetch resource and block if it belongs to an unassigned branch", async () => {
    mockRequest.url = "/api/v1/tickets/123";
    mockRequest.params.id = "123";
    mockPrismaService.repairTicket.findUnique.mockResolvedValue({
      branchId: "unassigned-branch",
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should fetch resource and allow if it belongs to an assigned branch", async () => {
    mockRequest.url = "/api/v1/tickets/123";
    mockRequest.params.id = "123";
    mockPrismaService.repairTicket.findUnique.mockResolvedValue({
      branchId: "branch-1",
    });

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should block user access if they do not share any branch with the target user", async () => {
    mockRequest.url = "/api/v1/users/456";
    mockRequest.params.id = "456";
    mockPrismaService.user.findUnique.mockResolvedValue({
      userBranches: [{ branchId: "branch-2" }],
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should allow user access if they share a branch with the target user", async () => {
    mockRequest.url = "/api/v1/users/456";
    mockRequest.params.id = "456";
    mockPrismaService.user.findUnique.mockResolvedValue({
      userBranches: [{ branchId: "branch-1" }],
    });

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should block user access if the target user has no branches assigned", async () => {
    mockRequest.url = "/api/v1/users/456";
    mockRequest.params.id = "456";
    mockPrismaService.user.findUnique.mockResolvedValue({
      userBranches: [],
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
