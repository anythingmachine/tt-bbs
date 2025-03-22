'use client';

import { useCallback } from 'react';

/**
 * Custom hook for terminal typing animation
 * @param setText Function to update the text state
 * @param currentText Current text value
 * @param typingSpeed Speed of the typing animation in milliseconds
 * @param scrollToBottom Function to scroll content to bottom
 * @returns Function to animate typing of new content
 */
export function useTypingAnimation(
  setText: (value: React.SetStateAction<string>) => void,
  currentText: string,
  typingSpeed: number,
  scrollToBottom: () => void
) {
  const animateTyping = useCallback((content: string, append: boolean = false) => {
    if (!content) return;
    
    let i = 0;
    const speed = typingSpeed;
    const initialText = append ? currentText : '';
    
    const typing = setInterval(() => {
      if (i < content.length) {
        setText(initialText + content.substring(0, i + 1));
        i++;
        scrollToBottom(); // Scroll while typing
      } else {
        clearInterval(typing);
        scrollToBottom(); // Final scroll after typing completes
      }
    }, speed);
    
    // Clean up interval on component unmount
    return () => clearInterval(typing);
  }, [currentText, typingSpeed, setText, scrollToBottom]);
  
  return animateTyping;
} 