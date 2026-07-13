import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketsPage from './page';
import { useAuth } from '@/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';

import { vi } from 'vitest';

// Mock Next.js components
vi.mock('next/link', () => {
  return { default: function MockLink({ children }: { children: React.ReactNode }) { return <a>{children}</a>; } };
});

// Mock hooks
vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
  useQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useMutation: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

describe('Repair Ticket Form Validation', () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      user: { role: 'BRANCH_MANAGER' },
      activeBranchId: 'branch-1'
    });
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: vi.fn()
    });
  });

  it('renders the tickets page', () => {
    render(<TicketsPage />);
    expect(screen.getByText('Repair Tickets')).toBeInTheDocument();
  });

  it('opens new ticket modal and validates empty submission', async () => {
    render(<TicketsPage />);
    
    // Open new ticket modal
    const newTicketBtns = screen.getAllByRole('button', { name: /Create Ticket/i });
    fireEvent.click(newTicketBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Create Repair Ticket')).toBeInTheDocument();
    });

    // Try to submit without filling required fields
    const submitBtns = screen.getAllByRole('button', { name: /Create Ticket/i });
    fireEvent.click(submitBtns[1]);

    // Wait for validation errors to appear
    await waitFor(() => {
      // The validation errors will show up with text-red-500 class
      expect(document.querySelectorAll('.text-red-500').length).toBeGreaterThan(0);
    });
  });
});
