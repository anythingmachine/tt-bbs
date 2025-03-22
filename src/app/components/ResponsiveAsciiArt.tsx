'use client';

import { useState, useEffect } from 'react';

interface ResponsiveAsciiArtProps {
  fullArt: string;
  simplifiedArt?: string;
  className?: string;
}

const ResponsiveAsciiArt = ({
  fullArt,
  simplifiedArt,
  className = '',
}: ResponsiveAsciiArtProps) => {
  const [windowWidth, setWindowWidth] = useState(0);
  
  useEffect(() => {
    // Initialize with the current window width
    setWindowWidth(window.innerWidth);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Use simplified art on smaller screens if provided
  const artToDisplay = windowWidth < 768 && simplifiedArt ? simplifiedArt : fullArt;
  
  // Additional responsive styling
  const fontSize = windowWidth < 480 ? '0.5em' :
                  windowWidth < 768 ? '0.7em' : '1em';
  
  return (
    <pre 
      className={`${className}`}
      style={{ fontSize, lineHeight: windowWidth < 768 ? 1 : 1.2 }}
    >
      {artToDisplay}
    </pre>
  );
};

export default ResponsiveAsciiArt; 