/**
 * Authentication Context
 * Manages JWT token and user state globally
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { LoginResponse, AuthContextType } from '../types';
import { api } from '../services/api';
import { AuthContext } from './AuthContextValue';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
  });

  const [user, setUser] = useState<LoginResponse['user'] | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(!!token && !user);

  useEffect(() => {
    let mounted = true;

    const hydrateUser = async () => {
      if (!token || user) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch {
        if (!mounted) return;
        api.logout();
        setToken(null);
        setUser(null);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    hydrateUser();

    return () => {
      mounted = false;
    };
  }, [token, user]);

  const requestOtp = useCallback(async (email: string) => {
    return api.sendOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const response = await api.verifyOtp(email, code);
    const accessToken = response.accessToken || response.token || null;
    setToken(accessToken);
    setUser(response.user);
    localStorage.setItem('user', JSON.stringify(response.user));
  }, []);

  const cancelOtp = useCallback(async (email: string) => {
    await api.cancelOtp(email);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const value: AuthContextType = {
    token,
    user,
    requestOtp,
    verifyOtp,
    cancelOtp,
    logout,
    isAuthenticated: !!token && !!user,
    isAuthLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
