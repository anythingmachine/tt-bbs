'use client';

import { LoginRequest, RegisterRequest, UserData, AuthResponse } from '../types/auth';

/**
 * Service for handling authentication operations
 */
export const authService = {
  /**
   * Log in a user and associate them with the current session
   * @param credentials Login credentials and session ID
   * @returns Auth response with user data
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      return await response.json();
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        message: 'An error occurred during login. Please try again.',
      };
    }
  },

  /**
   * Register a new user and associate them with the current session
   * @param userData Registration data and session ID
   * @returns Auth response with user data
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      console.error('Error during registration:', error);
      return {
        success: false,
        message: 'An error occurred during registration. Please try again.',
      };
    }
  },

  /**
   * Log out the current user from their session
   * @param sessionId The current session ID
   * @returns Auth response
   */
  logout: async (sessionId: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        success: false,
        message: 'An error occurred during logout. Please try again.',
      };
    }
  },

  /**
   * Get the current user associated with a session
   * @param sessionId The current session ID
   * @returns Auth response with user data if logged in
   */
  getCurrentUser: async (sessionId: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`/api/auth/me?sessionId=${sessionId}`);

      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        success: false,
        message: 'An error occurred while fetching user data.',
      };
    }
  },
};
