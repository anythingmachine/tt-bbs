'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Update session key to match the one used in terminalService
const SESSION_KEY = 'terminalSessionId';

interface UseSessionReturn {
  sessionId: string;
  resetSession: () => void;
  clearSession: () => void;
}

/**
 * Hook to manage the session ID
 * - Retrieves existing session ID from localStorage if available
 * - Creates and stores a new session ID if none exists
 * - Provides functions to reset or clear the session if needed
 */
export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Get existing session ID or create a new one
    let id = localStorage.getItem(SESSION_KEY);
    
    if (!id) {
      id = uuidv4();
      localStorage.setItem(SESSION_KEY, id);
    }
    
    setSessionId(id);
  }, []);

  /**
   * Reset the current session and create a new one
   */
  const resetSession = () => {
    if (typeof window === 'undefined') return;
    
    const newId = uuidv4();
    localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
  };

  /**
   * Clear the session entirely
   * This is used for logout operations
   */
  const clearSession = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(SESSION_KEY);
    setSessionId('');
    
    // After a short delay, create a new session ID
    setTimeout(() => {
      const newId = uuidv4();
      localStorage.setItem(SESSION_KEY, newId);
      setSessionId(newId);
    }, 100);
  };

  return { sessionId, resetSession, clearSession };
} 