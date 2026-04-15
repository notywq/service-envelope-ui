/**
 * Authentication Context
 * Manages JWT token and user state globally
 */

import React, { createContext, useState, useCallback } from 'react';
import type { LoginResponse, AuthContextType } from '../types';
import { api } from '../services/api';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const [user, setUser] = useState<LoginResponse['user'] | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(email, password);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    },
    []
  );

  const logout = useCallback(() => {
    api.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const value: AuthContextType = {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
