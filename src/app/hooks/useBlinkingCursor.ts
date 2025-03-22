'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to manage terminal cursor blinking
 * @param blinkSpeed The speed of cursor blinking in milliseconds
 * @returns Current cursor visibility state
 */
export function useBlinkingCursor(blinkSpeed: number = 500) {
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, blinkSpeed);
    
    return () => clearInterval(cursorInterval);
  }, [blinkSpeed]);
  
  return cursorVisible;
} 