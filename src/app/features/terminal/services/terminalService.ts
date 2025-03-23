'use client';

import { WelcomeResponse, CommandResponse, SessionResponse } from '../types/terminal';

/**
 * Service for handling terminal API calls
 */
export const terminalService = {
  /**
   * Fetch welcome screen from the API
   * @param sessionId Optional existing session ID
   * @param simplified Whether to return simplified ASCII art
   * @returns Welcome screen response
   */
  fetchWelcomeScreen: async (
    sessionId?: string,
    simplified: boolean = false
  ): Promise<WelcomeResponse> => {
    const url = sessionId
      ? `/api/terminal/init?sessionId=${sessionId}&simplified=${simplified}`
      : `/api/terminal/init?simplified=${simplified}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch welcome screen: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Process a user command
   * @param sessionId The current session ID
   * @param command The command to process
   * @returns Command response
   */
  processCommand: async (sessionId: string, command: string): Promise<CommandResponse> => {
    const response = await fetch('/api/terminal/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, command }),
    });

    if (!response.ok) {
      throw new Error(`Failed to process command: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Validate a session with the server
   * @param sessionId The session ID to validate
   * @returns Session response
   */
  validateSession: async (sessionId: string): Promise<SessionResponse> => {
    const response = await fetch(`/api/terminal/session?sessionId=${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to validate session: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Store session ID in localStorage
   * @param sessionId The session ID to store
   */
  storeSessionId: (sessionId: string): void => {
    localStorage.setItem('bbs_session_id', sessionId);
  },

  /**
   * Get stored session ID from localStorage
   * @returns The stored session ID or null if not found
   */
  getStoredSessionId: (): string | null => localStorage.getItem('bbs_session_id'),

  /**
   * Clear stored session ID from localStorage
   */
  clearStoredSessionId: (): void => {
    localStorage.removeItem('bbs_session_id');
  },
};
