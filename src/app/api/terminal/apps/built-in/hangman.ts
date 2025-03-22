import { BbsApp, CommandResult, BbsSession } from 'bbs-sdk';

// Sample words for hangman game
const words = [
  'TERMINAL',
  'MODEM',
  'COMPUTER',
  'BULLETIN',
  'BOARD',
  'SYSTEM',
  'RETRO',
  'VINTAGE',
  'ASCII',
  'ANSI',
  'TELNET',
  'DIAL',
  'CONNECTION',
  'BAUD',
  'RATE',
  'DOWNLOAD',
  'UPLOAD',
  'MESSAGE',
  'FORUM',
  'CHAT'
];

// Game state interface
interface GameState {
  word: string;
  guessed: string[];
  remainingAttempts: number;
  status: 'playing' | 'won' | 'lost';
}

// Game sessions storage - in a real app, this would be in a database
const gameSessions: Record<string, GameState> = {};

// Helper functions for the hangman game
const helpers = {
  // Start a new game
  startNewGame(sessionId: string): GameState {
    // Select a random word
    const word = words[Math.floor(Math.random() * words.length)];
    
    // Create initial game state
    const gameState: GameState = {
      word,
      guessed: [],
      remainingAttempts: 6,
      status: 'playing'
    };
    
    // Store the game state
    gameSessions[sessionId] = gameState;
    
    return gameState;
  },
  
  // Get game state for a session
  getGameState(sessionId: string): GameState | null {
    return gameSessions[sessionId] || null;
  },
  
  // Process a guess
  makeGuess(sessionId: string, letter: string): GameState {
    const gameState = gameSessions[sessionId];
    
    if (!gameState || gameState.status !== 'playing') {
      return helpers.startNewGame(sessionId);
    }
    
    // Convert guess to uppercase
    letter = letter.toUpperCase();
    
    // If letter was already guessed, return current state
    if (gameState.guessed.includes(letter)) {
      return gameState;
    }
    
    // Add letter to guessed letters
    gameState.guessed.push(letter);
    
    // If letter is not in the word, decrease remaining attempts
    if (!gameState.word.includes(letter)) {
      gameState.remainingAttempts--;
    }
    
    // Check if player has won
    const hasWon = gameState.word.split('').every(char => 
      gameState.guessed.includes(char)
    );
    
    if (hasWon) {
      gameState.status = 'won';
    } else if (gameState.remainingAttempts <= 0) {
      gameState.status = 'lost';
    }
    
    // Return updated game state
    return gameState;
  },
  
  // Generate hangman ASCII art
  drawHangman(remainingAttempts: number): string {
    const hangmanStages = [
      `
  +---+
  |   |
      |
      |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
      `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`
    ];
    
    const stage = 6 - remainingAttempts;
    return hangmanStages[stage];
  },
  
  // Show the current word with underscores for unguessed letters
  displayWord(word: string, guessed: string[]): string {
    return word
      .split('')
      .map(letter => guessed.includes(letter) ? letter : '_')
      .join(' ');
  },
  
  // Generate the game screen
  generateGameScreen(gameState: GameState): string {
    const { word, guessed, remainingAttempts, status } = gameState;
    
    let screen = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

HANGMAN

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

${helpers.drawHangman(remainingAttempts)}

Word: ${helpers.displayWord(word, guessed)}

Guessed letters: ${guessed.join(', ') || 'None'}

Remaining attempts: ${remainingAttempts}

`;
    
    if (status === 'won') {
      screen += `
CONGRATULATIONS! You've guessed the word: ${word}

Type N to start a new game or B to return to the main menu.
`;
    } else if (status === 'lost') {
      screen += `
GAME OVER! The word was: ${word}

Type N to start a new game or B to return to the main menu.
`;
    } else {
      screen += `
Type a letter to guess, N for a new game, or B to return to the main menu.
`;
    }
    
    return screen;
  }
};

// Hangman Game App Implementation
const HangmanApp: BbsApp = {
  id: 'hangman',
  name: 'Hangman',
  version: '1.0.0',
  description: 'Classic word guessing game',
  author: 'BBS System',
  
  // Get the welcome screen
  getWelcomeScreen(): string {
    return `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

HANGMAN

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Welcome to the classic word guessing game!

Try to guess the word by suggesting letters. Each incorrect guess
brings the hangman closer to completion. You have 6 attempts before
the game is over.

All words are related to BBS and retro computing.

Type P to play or B to return to the main menu.
`;
  },
  
  // Handle commands
  handleCommand(screenId: string | null, command: string, session: BbsSession): CommandResult {
    const cmd = command.trim().toUpperCase();
    
    // Extract session ID
    const sessionId = session.sessionId;
    
    // If returning to main menu
    if (cmd === 'B' || cmd === 'BACK') {
      return {
        screen: null,  // This will trigger the core system to go back to main menu
        response: 'Returning to main menu...',
        refresh: true
      };
    }
    
    switch (screenId) {
      case 'home':
        // From the welcome screen
        if (cmd === 'P' || cmd === 'PLAY') {
          // Start a new game
          const gameState = helpers.startNewGame(sessionId);
          return {
            screen: 'game',
            response: helpers.generateGameScreen(gameState),
            refresh: true
          };
        }
        break;
        
      case 'game':
        // From the game screen
        
        // Check for commands
        if (cmd === 'N' || cmd === 'NEW') {
          // Start a new game
          const gameState = helpers.startNewGame(sessionId);
          return {
            screen: 'game',
            response: helpers.generateGameScreen(gameState),
            refresh: true
          };
        }
        
        // Otherwise, treat input as a letter guess
        if (cmd.length === 1 && cmd >= 'A' && cmd <= 'Z') {
          // Get or create game state
          let gameState = helpers.getGameState(sessionId);
          
          if (!gameState) {
            gameState = helpers.startNewGame(sessionId);
          }
          
          // Make the guess
          gameState = helpers.makeGuess(sessionId, cmd);
          
          // Return updated screen
          return {
            screen: 'game',
            response: helpers.generateGameScreen(gameState),
            refresh: true
          };
        }
        break;
    }
    
    // If we get here, the command wasn't recognized
    
    // Default response for invalid command
    return {
      screen: screenId || 'home',
      response: `Invalid command: ${command}\nType HELP for available commands.`,
      refresh: false
    };
  },
  
  // Get help text
  getHelp(screenId: string | null): string {
    let helpText = `
HANGMAN COMMANDS:
`;
    
    switch (screenId) {
      case 'home':
        helpText += `
P or PLAY - Start a new game
B - Return to main menu
`;
        break;
        
      case 'game':
        helpText += `
A-Z - Guess a letter
N or NEW - Start a new game
B - Return to main menu
`;
        break;
        
      default:
        helpText += `
Commands vary depending on the current screen.
`;
    }
    
    return helpText;
  },
  
  // Optional initialization hook
  onInit() {
    console.log('Hangman game initialized');
  }
};

// Export the app
export default HangmanApp; 