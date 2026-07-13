import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api-client';

import type { Mock } from 'vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

// Mock Auth Provider
vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('Login Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      checkSession: vi.fn(),
    });
  });

  it('renders login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText('Staff Portal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. tech.a1@repairflow.com')).toBeInTheDocument();
  });

  it('shows validation errors on empty submission', async () => {
    render(<LoginPage />);
    
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('submits form when credentials are valid', async () => {
    (apiClient.post as Mock).mockResolvedValueOnce({
      data: { accessToken: 'token', user: { role: 'OWNER', email: 'owner@repairflow.com' } }
    });

    render(<LoginPage />);
    
    fireEvent.change(screen.getByPlaceholderText('e.g. tech.a1@repairflow.com'), { target: { value: 'owner@repairflow.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'owner@repairflow.com',
        password: 'password123'
      });
    });
  });
});
