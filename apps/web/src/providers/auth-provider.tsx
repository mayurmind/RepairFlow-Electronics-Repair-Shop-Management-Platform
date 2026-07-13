'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAccessToken, getAccessToken } from '@/lib/api-client';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      console.log('AuthProvider: Fetching current session from /auth/me...');
      const res: any = await apiClient.get('/auth/me');
      console.log('AuthProvider: /auth/me response res =', res);
      console.log('AuthProvider: Setting user state to res.data =', res.data);
      setUser(res.data);
    } catch (err) {
      console.error('AuthProvider: checkSession error =', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.branches && user.branches.length > 0) {
      const hasBranch = user.branches.some((b: any) => b.id === activeBranchId);
      if (!hasBranch) {
        setActiveBranchId(user.branches[0].id);
      }
    } else if (!user) {
      setActiveBranchId(null);
    }
  }, [user, activeBranchId]);

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setActiveBranchId(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, activeBranchId, setActiveBranchId, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
