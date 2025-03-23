'use client';

import { FC, useState, useEffect, useCallback } from 'react';

interface TerminalHistoryProps {
  setInput: (value: string) => void;
  currentCommand: string;
  isWaitingForInput: boolean;
}

/**
 * Component to handle terminal command history navigation
 */
export const TerminalHistory: FC<TerminalHistoryProps> = ({
  setInput,
  currentCommand,
  isWaitingForInput,
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [savedCurrentCommand, setSavedCurrentCommand] = useState<string>('');

  // Add command to history when executed
  const _addToHistory = useCallback((command: string) => {
    if (command.trim()) {
      setHistory((prev) => {
        // Remove duplicates
        const filtered = prev.filter((cmd) => cmd !== command);
        return [...filtered, command];
      });
    }
  }, []);

  // Handle key presses for history navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isWaitingForInput) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();

        // Save current command when starting history navigation
        if (historyIndex === -1 && currentCommand) {
          setSavedCurrentCommand(currentCommand);
        }

        // Navigate up through history
        if (history.length > 0 && historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();

        // Navigate down through history
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(history[history.length - 1 - newIndex]);
        } else if (historyIndex === 0) {
          // Restore saved command when reaching the bottom
          setHistoryIndex(-1);
          setInput(savedCurrentCommand);
        }
      }
    },
    [history, historyIndex, setInput, isWaitingForInput, currentCommand, savedCurrentCommand]
  );

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset history navigation when command changes
  useEffect(() => {
    setHistoryIndex(-1);
  }, [currentCommand]);

  return null; // This component doesn't render anything
};
