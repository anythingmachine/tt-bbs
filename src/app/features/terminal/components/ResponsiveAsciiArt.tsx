'use client';

import React, { FC, memo } from 'react';

interface ResponsiveAsciiArtProps {
  fullArt: string;
  simplifiedArt: string;
  showFull: boolean;
}

/**
 * Component to render ASCII art based on screen size
 * Memoized to prevent unnecessary re-renders
 */
export const ResponsiveAsciiArt: FC<ResponsiveAsciiArtProps> = memo(
  ({ fullArt, simplifiedArt, showFull }) => <pre>{showFull ? fullArt : simplifiedArt}</pre>
);
