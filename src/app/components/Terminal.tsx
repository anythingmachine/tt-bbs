'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Terminal.module.css';

// Import types from the types folder
import { 
  TerminalProps, 
  TerminalSession,
} from '../types/terminal';

// Import hooks from the hooks folder
import { 
  useBlinkingCursor,
  useTerminalSize,
  useTypingAnimation
} from '../hooks';

// Import terminal service
import { terminalService } from '../services/terminalService';

// ------ Main Component ------

const Terminal: React.FC<TerminalProps> = ({ typingSpeed = 5 }) => {
  // ------ State Management ------
  // Core terminal state
  const [text, setText] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [displayText, setDisplayText] = useState<string>('');
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  
  // Session state
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // ------ Refs ------
  const terminalRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ------ Custom Hooks ------
  const cursorVisible = useBlinkingCursor();
  const { terminalSize, showFullAscii, measureTerminalSize } = useTerminalSize(terminalRef as React.RefObject<HTMLDivElement>);
  
  /**
   * Scroll terminal to the bottom after content changes
   */
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
        setIsInitialized(true);
        return;
      } 

        try {
          // Validate the session with the server
          const data = await terminalService.validateSession(savedSessionId);
          
          if (data.exists) {
            // Session exists, reuse it
            setSession({ sessionId: savedSessionId, currentArea: data.currentArea });
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
  }, [isInitialized, measureTerminalSize]);
  
  // ------ Terminal Functions ------
  
  /**
   * Auto-scroll when display text changes
   */
  useEffect(() => {
    scrollToBottom();
  }, [displayText, scrollToBottom]);
  
  /**
   * Fetch welcome screen from the API
   */
  const fetchWelcomeScreen = async (existingSessionId?: string) => {
    try {
      // Get welcome screen with appropriate ASCII art version
      const data = await terminalService.fetchWelcomeScreen(existingSessionId, !showFullAscii);
      
      // Save the session ID
      if (!existingSessionId && data.sessionId) {
        terminalService.storeSessionId(data.sessionId);
        setSession({ sessionId: data.sessionId, currentArea: data.currentArea || 'main' });
      }
      
      if (!data.defaultWelcomeText) {
        setText('');
        setTimeout(() => {
          animateTyping('ERROR: Could not connect to the BBS. Please try again later.');
        }, 100);
        setIsWaitingForInput(true);
        return;
      }
      
      animateTyping(data.defaultWelcomeText);
      setIsWaitingForInput(true);
      
    } catch (error) {
      console.error('Error fetching welcome screen:', error);
      setText('ERROR: Could not connect to the BBS. Please try again later.');
      setIsWaitingForInput(true);
    }
  };
  
  /**
   * Process user commands and send to API
   */
  const processCommand = async (command: string) => {
    if (!session) return;
    
    setIsWaitingForInput(false);
    setText(prev => `${prev}\n> ${command}\n`);
    setInput('');
    scrollToBottom(); // Scroll after command is displayed
    
    try {
      const response = await terminalService.processCommand(session.sessionId, command);
      
      if (response.success) {
        // Update session with the data from response
        setSession({ 
          sessionId: response.data.session.id, 
          currentArea: response.data.session.currentArea 
        });
      
        if (response.data.refresh) {
          // Clear screen and show new content
          setText('');
          setTimeout(() => {
            animateTyping(response.data.response);
          }, 100);
        } else {
          // Append to existing content
          animateTyping(response.data.response, true);
        }
      } else {
        // Handle error response
        animateTyping(`ERROR: ${response.message || 'Command failed'}`);
      }
      
      setIsWaitingForInput(true);
    } catch (error) {
      console.error('Error processing command:', error);
      setText(prev => `${prev}ERROR: Could not process command. Please try again.\n`);
      setIsWaitingForInput(true);
    }
  };
  
  /**
   * Update display text with cursor for input line
   */
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
  
  /**
   * Handle input change from hidden text field
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setInput(newInput);
  };
  
  /**
   * Handle form submission (when Enter is pressed)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isWaitingForInput) {
      processCommand(input.trim());
    }
  };
  
  /**
   * Focus input when terminal is clicked
   */
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  /**
   * Auto-focus input when component mounts or when waiting for input
   */
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);
  
  /**
   * Calculate appropriate font size based on terminal width
   */
  const calculateFontSize = () => {
    // Adjust font size based on terminal width for better ASCII art display
    if (terminalSize.width < 400) return '10px';
    if (terminalSize.width < 768) return '14px';
    return '16px'; // Default size
  };

  // ------ Render ------
  return (
    <div 
      ref={terminalRef} 
      className={styles.terminal} 
      onClick={focusInput}
      style={{ fontSize: calculateFontSize() }}
      aria-label="Terminal interface"
      role="application"
    >
      <div 
        ref={outputRef} 
        className={styles.output}
        aria-live="polite"
      >
        <pre>{displayText}</pre>
      </div>
      <form 
        onSubmit={handleSubmit} 
        className={styles.inputForm}
        aria-hidden="true"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          className={styles.input}
          autoFocus
          disabled={!isWaitingForInput}
          style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
          aria-label="Terminal input"
        />
      </form>
    </div>
  );
};

export default Terminal; 