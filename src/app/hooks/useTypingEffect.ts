import { useState, useEffect } from 'react';

interface UseTypingEffectProps {
  text: string;
  typingSpeed?: number;
  onComplete?: () => void;
}

export const useTypingEffect = ({
  text,
  typingSpeed = 10,
  onComplete
}: UseTypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    
    // Reset state when text changes
    setDisplayedText('');
    setIsComplete(false);
    
    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsComplete(true);
        onComplete?.();
      }
    }, typingSpeed);
    
    return () => clearInterval(typingInterval);
  }, [text, typingSpeed, onComplete]);

  return { displayedText, isComplete };
};

export default useTypingEffect; 