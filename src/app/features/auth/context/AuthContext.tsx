'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { UserData } from '../types/auth';
import { useSession } from '../hooks/useSession';

interface AuthContextType {
  user: UserData | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    password: string,
    displayName: string,
    email?: string
  ) => Promise<boolean>;
  logout: () => Promise<boolean>;
  clearError: () => void;
  resetAuthState: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  login: async () => false,
  register: async () => false,
  logout: async () => false,
  clearError: () => {},
  resetAuthState: () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sessionId, clearSession, resetSession } = useSession();

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser(sessionId);
        if (response.success && response.user && response.isLoggedIn) {
          setUser(response.user);
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    if (!sessionId) {
      setError('No session available');
      setIsLoading(false);
      return false;
    }

    try {
      const response = await authService.login({
        username,
        password,
        sessionId,
      });

      if (response.success && response.user) {
        setUser(response.user);
        setIsLoggedIn(true);
        return true;
      } else {
        setError(response.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (
    username: string,
    password: string,
    displayName: string,
    email?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    if (!sessionId) {
      setError('No session available');
      setIsLoading(false);
      return false;
    }

    try {
      const response = await authService.register({
        username,
        password,
        displayName,
        email,
        sessionId,
      });

      if (response.success && response.user) {
        setUser(response.user);
        setIsLoggedIn(true);
        return true;
      } else {
        setError(response.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    if (!sessionId) {
      setError('No session available');
      setIsLoading(false);
      return false;
    }

    try {
      const response = await authService.logout(sessionId);

      if (response.success) {
        setUser(null);
        setIsLoggedIn(false);
        clearSession(); // Clear the session and create a new one
        return true;
      } else {
        setError(response.message || 'Logout failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset auth state function (for when authorization expires or is invalid)
  const resetAuthState = () => {
    setUser(null);
    setIsLoggedIn(false);
    resetSession();
    setError('Your session has expired. Please log in again.');
  };

  // Clear error function
  const clearError = () => setError(null);

  const value = {
    user,
    isLoggedIn,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    resetAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
