'use client';

import { useEffect, useRef, useState } from 'react';

interface TerminalAudioProps {
  autoPlay?: boolean;
}

const TerminalAudio = ({ autoPlay = true }: TerminalAudioProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple audio context for beep sounds
    const createBeepSound = (frequency: number, duration: number) => {
      if (typeof window === 'undefined') return;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, duration);
    };

    // Play sound effects when component mounts
    if (autoPlay) {
      console.log('Currently playing audio', isPlaying);
      // Initial connection sound
      setTimeout(() => createBeepSound(1200, 100), 500);
      setTimeout(() => createBeepSound(800, 100), 800);
      setTimeout(() => createBeepSound(1400, 100), 1200);
      
      // Dial-up modem simulation 
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(err => console.log('Audio play failed:', err));
          setIsPlaying(true);
        }
      }, 1500);
    }
  }, [autoPlay, isPlaying]);

  return (
    <>
      
    </>
  );
};

export default TerminalAudio; 