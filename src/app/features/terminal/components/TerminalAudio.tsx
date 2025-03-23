'use client';

import { FC, useRef, useEffect } from 'react';

interface TerminalAudioProps {
  typingEnabled?: boolean;
  keysoundEnabled?: boolean;
}

/**
 * Component to handle terminal sound effects
 */
export const TerminalAudio: FC<TerminalAudioProps> = ({
  typingEnabled = true,
  keysoundEnabled = true,
}) => {
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const keyAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      typingAudioRef.current = new Audio('/sounds/typing.mp3');
      keyAudioRef.current = new Audio('/sounds/key.mp3');

      // Configure audio settings
      if (typingAudioRef.current) {
        typingAudioRef.current.volume = 0.2;
        typingAudioRef.current.loop = true;
      }

      if (keyAudioRef.current) {
        keyAudioRef.current.volume = 0.3;
      }
    }

    // Cleanup audio on unmount
    return () => {
      if (typingAudioRef.current) {
        typingAudioRef.current.pause();
      }
      if (keyAudioRef.current) {
        keyAudioRef.current.pause();
      }
    };
  }, []);

  return null; // This component doesn't render anything
};
