/**
 * Terminal Feature
 *
 * This feature provides a terminal interface for interacting with the BBS.
 */

// Re-export components
export * from './components/ResponsiveAsciiArt';
export * from './components/Terminal';
export * from './components/TerminalAudio';
export * from './components/TerminalHistory';
export * from './components/TerminalInput';
export * from './components/TerminalOutput';

// Re-export hooks
export * from './hooks/useBlinkingCursor';
export * from './hooks/useTerminalSession';
export * from './hooks/useTerminalSize';
export * from './hooks/useTypingAnimation';

// Re-export types
export * from './types/terminal';

// Re-export services
export * from './services/terminalService';
