'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Terminal.module.css';

// Import types from the feature's types folder
import { TerminalProps } from '../types/terminal';

// Import feature components
import { TerminalOutput } from './TerminalOutput';
import { TerminalInput } from './TerminalInput';
import { TerminalHistory } from './TerminalHistory';
import { TerminalAudio } from './TerminalAudio';

// Import hooks
import { useBlinkingCursor } from '../hooks/useBlinkingCursor';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTypingAnimation } from '../hooks/useTypingAnimation';
import { useTerminalSession } from '../hooks/useTerminalSession';

// Import terminal service
import { terminalService } from '../services/terminalService';

/**
 * Main Terminal component
 * Provides a terminal interface for interacting with the BBS
 */
export const Terminal: React.FC<TerminalProps> = ({ typingSpeed = 5 }) => {
  // ------ State Management ------
  const [text, setText] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [displayText, setDisplayText] = useState<string>('');

  // ------ Refs ------
  const terminalRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ------ Custom Hooks ------
  const cursorVisible = useBlinkingCursor();
  const { showFullAscii, measureTerminalSize } = useTerminalSize(
    terminalRef as React.RefObject<HTMLDivElement>
  );

  // Scroll terminal to the bottom after content changes
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  // Use the typing animation hook
  const animateTyping = useTypingAnimation(setText, text, typingSpeed, scrollToBottom);

  // Use terminal session hook
  const { isInitialized, isWaitingForInput, fetchWelcomeScreen, processCommand } =
    useTerminalSession({
      onWelcomeScreen: (welcomeText) => {
        setText('');
        setTimeout(() => {
          animateTyping(welcomeText);
        }, 100);
      },
      onCommandResponse: (response, append) => {
        animateTyping(response, append);
      },
      showFullAscii,
    });

  // ------ Terminal Initialization ------
  useEffect(() => {
    if (isInitialized) return;

    const initializeTerminal = async () => {
      // First, measure the terminal size - this needs to happen before API call
      measureTerminalSize();

      // Check for existing session in localStorage
      const savedSessionId = terminalService.getStoredSessionId();

      if (!savedSessionId) {
        fetchWelcomeScreen();
        return;
      }

      try {
        // Validate the session with the server
        const data = await terminalService.validateSession(savedSessionId);

        if (data.exists) {
          // Session exists, reuse it
          fetchWelcomeScreen(savedSessionId);
        } else {
          // Session doesn't exist anymore, create a new one
          terminalService.clearStoredSessionId();
          fetchWelcomeScreen();
        }
      } catch (error) {
        console.error('Error validating session:', error);
        // If error, create new session
        fetchWelcomeScreen();
      }
    };

    initializeTerminal();
  }, [isInitialized, measureTerminalSize, fetchWelcomeScreen]);

  // ------ Terminal Functions ------

  // Auto-scroll when display text changes
  useEffect(() => {
    scrollToBottom();
  }, [displayText, scrollToBottom]);

  // Update display text with cursor for input line
  useEffect(() => {
    if (isWaitingForInput) {
      // Split text by lines to handle cursor positioning
      const lines = text.split('\n');
      let lastLine = lines[lines.length - 1] || '';

      // If the last line doesn't have the input prompt, add it
      if (!lastLine.startsWith('> ')) {
        lastLine = '> ' + input;
        lines.push(lastLine);
      } else {
        // Update last line with current input
        lines[lines.length - 1] = '> ' + input;
      }

      // Add cursor at the end of input if it's visible
      if (cursorVisible) {
        // Replace the last line with cursor at the end
        lines[lines.length - 1] = lines[lines.length - 1] + '▋';
      }

      setDisplayText(lines.join('\n'));
    } else {
      setDisplayText(text);
    }
  }, [text, input, cursorVisible, isWaitingForInput]);

  // ------ Event Handlers ------

  // Handle input change from hidden text field
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setInput(newInput);
  };

  // Handle form submission (when Enter is pressed)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isWaitingForInput) {
      processCommand(input.trim());
      setInput('');
    }
  };

  // Focus input when terminal is clicked
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-focus input when component mounts or when waiting for input
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  // ------ Render ------
  return (
    <div className={styles.terminal} ref={terminalRef} onClick={focusInput}>
      <TerminalOutput
        displayText={displayText}
        outputRef={outputRef as React.RefObject<HTMLDivElement>}
      />

      <TerminalInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        inputRef={inputRef as React.RefObject<HTMLInputElement>}
        isWaitingForInput={isWaitingForInput}
      />

      <TerminalHistory
        setInput={setInput}
        currentCommand={input}
        isWaitingForInput={isWaitingForInput}
      />

      <TerminalAudio typingEnabled={true} keysoundEnabled={true} />
    </div>
  );
};
