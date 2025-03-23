/**
 * Terminal interface types
 */

export interface TerminalSession {
  sessionId: string;
  currentArea: string;
}

export interface TerminalProps {
  typingSpeed?: number;
}

export interface WelcomeResponse {
  sessionId: string;
  defaultWelcomeText: string;
  fullWelcomeText?: string;
  simplifiedWelcomeText?: string;
  currentArea: string;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  data: {
    screen?: string;
    area: string;
    response: string;
    refresh: boolean;
    session: {
      id: string;
      currentArea: string;
      commandHistory: string[];
    };
  };
}

export interface SessionResponse {
  exists: boolean;
  currentArea: string;
  historyLength?: number;
}

export interface TerminalOutputProps {
  displayText: string;
  outputRef: React.RefObject<HTMLDivElement>;
}

export interface TerminalInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isWaitingForInput: boolean;
}
