import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './page';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Track Every Device/i)).toBeInTheDocument();
  });

  it('navigates to track page on valid token submission', () => {
    render(<HomePage />);
    const input = screen.getByPlaceholderText(/Paste your secure tracking token here/i);
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'test-token123' } });
    fireEvent.submit(form!);

    expect(mockPush).toHaveBeenCalledWith('/track/test-token123');
  });

  it('does not navigate on empty token', () => {
    mockPush.mockClear();
    render(<HomePage />);
    const input = screen.getByPlaceholderText(/Paste your secure tracking token here/i);
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(form!);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
