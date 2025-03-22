'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface TerminalSize {
  width: number;
  height: number;
}

/**
 * Custom hook to measure terminal size and determine display mode
 * @param terminalRef Reference to the terminal container element
 * @returns Object containing terminal size, ASCII display mode, and measurement function
 */
export function useTerminalSize(terminalRef: RefObject<HTMLDivElement>) {
  const [terminalSize, setTerminalSize] = useState<TerminalSize>({ width: 800, height: 600 });
  const [showFullAscii, setShowFullAscii] = useState<boolean>(true);
  
  const measureTerminalSize = useCallback(() => {
    if (terminalRef.current) {
      const { clientWidth, clientHeight } = terminalRef.current;
      setTerminalSize({ width: clientWidth, height: clientHeight });
      // Determine if we should show full ASCII art based on width
      const shouldShowFull = clientWidth >= 768;
      setShowFullAscii(shouldShowFull);
    }
  }, [terminalRef]);
  
  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', measureTerminalSize);
    return () => window.removeEventListener('resize', measureTerminalSize);
  }, [measureTerminalSize]);
  
  return { terminalSize, showFullAscii, measureTerminalSize };
} 