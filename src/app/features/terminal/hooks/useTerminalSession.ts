'use client';

import { useState, useCallback } from 'react';
import { terminalService } from '../services/terminalService';
import { TerminalSession } from '../types/terminal';

interface UseTerminalSessionProps {
  onWelcomeScreen: (text: string) => void;
  onCommandResponse: (text: string, append: boolean) => void;
  showFullAscii: boolean;
}

interface UseTerminalSessionResult {
  session: TerminalSession | null;
  isInitialized: boolean;
  isWaitingForInput: boolean;
  fetchWelcomeScreen: (existingSessionId?: string) => Promise<void>;
  processCommand: (command: string) => Promise<void>;
  setIsWaitingForInput: (value: boolean) => void;
  setIsInitialized: (value: boolean) => void;
}

/**
 * Custom hook to manage terminal session state and interactions
 * @param props Configuration options for the terminal session
 * @returns Terminal session state and functions
 */
export function useTerminalSession({
  onWelcomeScreen,
  onCommandResponse,
  showFullAscii,
}: UseTerminalSessionProps): UseTerminalSessionResult {
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);

  /**
   * Fetch welcome screen from the API
   */
  const fetchWelcomeScreen = useCallback(
    async (existingSessionId?: string) => {
      try {
        // Get welcome screen with appropriate ASCII art version
        const data = await terminalService.fetchWelcomeScreen(existingSessionId, !showFullAscii);

        // Determine which session ID to use
        const sessionId = data.sessionId || existingSessionId;

        // Set session if we have a valid session ID
        if (sessionId) {
          // For new sessions, store the ID in localStorage
          if (data.sessionId && !existingSessionId) {
            terminalService.storeSessionId(sessionId);
          }

          // Update session state
          setSession({
            sessionId: sessionId,
            currentArea: data.currentArea || 'main',
          });
        }

        if (!data.defaultWelcomeText) {
          onWelcomeScreen('');
          setTimeout(() => {
            onCommandResponse(
              'ERROR: Could not connect to the BBS. Please try again later.',
              false
            );
          }, 100);
          setIsWaitingForInput(true);
          return;
        }

        onWelcomeScreen(data.defaultWelcomeText);
        setIsWaitingForInput(true);
      } catch (error) {
        console.error('Error fetching welcome screen:', error);
        onWelcomeScreen('ERROR: Could not connect to the BBS. Please try again later.');
        setIsWaitingForInput(true);
      }
    },
    [onWelcomeScreen, onCommandResponse, showFullAscii]
  );

  /**
   * Process user commands and send to API
   */
  const processCommand = useCallback(
    async (command: string) => {
      if (!session) return;

      setIsWaitingForInput(false);
      onCommandResponse(`\n> ${command}\n`, true);

      try {
        const response = await terminalService.processCommand(session.sessionId, command);

        if (response.success) {
          // Update session with the data from response
          setSession({
            sessionId: response.data.session.id,
            currentArea: response.data.session.currentArea,
          });

          if (response.data.refresh) {
            // Clear screen and show new content
            onWelcomeScreen('');
            setTimeout(() => {
              onCommandResponse(response.data.response, false);
            }, 100);
          } else {
            // Append to existing content
            onCommandResponse(response.data.response, true);
          }
        } else {
          // Handle error response
          onCommandResponse(`ERROR: ${response.message || 'Command failed'}`, true);
        }

        setIsWaitingForInput(true);
      } catch (error) {
        console.error('Error processing command:', error);
        onCommandResponse('ERROR: Could not process command. Please try again.\n', true);
        setIsWaitingForInput(true);
      }
    },
    [session, onWelcomeScreen, onCommandResponse]
  );

  return {
    session,
    isInitialized,
    isWaitingForInput,
    fetchWelcomeScreen,
    processCommand,
    setIsWaitingForInput,
    setIsInitialized,
  };
}
