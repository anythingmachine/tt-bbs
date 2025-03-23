'use client';

import React, { useState, useEffect, memo } from 'react';

interface ResponsiveAsciiArtProps {
  fullArt: string;
  simplifiedArt?: string;
  className?: string;
}

/**
 * Responsive ASCII art component that adapts to different screen sizes
 * Displays simplified version on smaller screens if provided
 */
const ResponsiveAsciiArt: React.FC<ResponsiveAsciiArtProps> = memo(
  ({ fullArt, simplifiedArt, className = '' }) => {
    const [windowWidth, setWindowWidth] = useState<number>(0);

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
    const fontSize = windowWidth < 480 ? '0.5em' : windowWidth < 768 ? '0.7em' : '1em';

    return (
      <pre className={`${className}`} style={{ fontSize, lineHeight: windowWidth < 768 ? 1 : 1.2 }}>
        {artToDisplay}
      </pre>
    );
  }
);

// Add display name for ESLint
ResponsiveAsciiArt.displayName = 'ResponsiveAsciiArt';

export default ResponsiveAsciiArt;
