import { BbsApp, CommandResult, BbsSession } from 'bbs-sdk';

// Define interfaces for our message board types
interface Board {
  id: string;
  name: string;
  description: string;
}

interface Message {
  id: string;
  title: string;
  author: string;
  date: string;
  content: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  author: string;
  date: string;
  content: string;
}

// Sample data - in a real app, this would be stored in a database
const messageBoards: Board[] = [
  {
    id: 'general',
    name: 'General Discussion',
    description: 'General chat about any topic'
  },
  {
    id: 'tech',
    name: 'Technology Corner',
    description: 'Discuss the latest tech news and gadgets'
  },
  {
    id: 'retro',
    name: 'Retro Computing',
    description: 'Share your love for old computers and classic BBS systems'
  }
];

const messages: Record<string, Message[]> = {
  'general': [
    {
      id: '1',
      title: 'Welcome to the BBS!',
      author: 'Admin',
      date: '2023-08-01',
      content: 'Hello everyone! Welcome to our new BBS system. Feel free to post and share your thoughts here.',
      replies: [
        {
          id: '1-1',
          author: 'User1',
          date: '2023-08-01',
          content: 'This is awesome! Brings back memories of the good old days.'
        }
      ]
    }
  ],
  'tech': [
    {
      id: '1',
      title: 'Favorite Terminal Applications?',
      author: 'TechGuru',
      date: '2023-08-02',
      content: 'What are your favorite terminal applications? I\'ve been using tmux and vim for years.',
      replies: []
    }
  ],
  'retro': [
    {
      id: '1',
      title: 'BBS Software of the 90s',
      author: 'RetroFan',
      date: '2023-08-03',
      content: 'Remember WWIV, Renegade, and Telegard? Those were the glory days of BBS software!',
      replies: [
        {
          id: '1-1',
          author: 'OldTimer',
          date: '2023-08-03',
          content: 'I ran a WWIV board for 7 years. Had 4 phone lines at one point!'
        }
      ]
    }
  ]
};

// Helper functions for generating views
const generateBoardsView = () => {
  let view = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

MESSAGE BOARDS

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

AVAILABLE BOARDS:

`;

  messageBoards.forEach((board, index) => {
    view += `[${index + 1}] ${board.name.toUpperCase()}\n    ${board.description}\n\n`;
  });

  view += `Enter a board number or B to go back.`;
  return view;
};

const generateBoardView = (boardId: string) => {
  const board = messageBoards.find(b => b.id === boardId);
  if (!board) return 'Board not found.';

  const boardMessages = messages[boardId] || [];

  let view = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

${board.name.toUpperCase()}

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

${board.description}

MESSAGES:

`;

  if (boardMessages.length === 0) {
    view += `No messages in this board yet.\n`;
  } else {
    boardMessages.forEach((message, index) => {
      view += `[${index + 1}] ${message.title} by ${message.author} on ${message.date}\n`;
    });
  }

  view += `\nEnter a message number to read, N to post a new message, or B to go back.`;
  return view;
};

const generateMessageView = (boardId: string, messageId: string) => {
  const board = messageBoards.find(b => b.id === boardId);
  if (!board) return 'Board not found.';

  const boardMessages = messages[boardId] || [];
  const message = boardMessages.find(m => m.id === messageId);
  if (!message) return 'Message not found.';

  let view = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

${message.title}

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Posted by: ${message.author} on ${message.date}

${message.content}

REPLIES:
`;

  if (message.replies.length === 0) {
    view += `No replies yet.\n`;
  } else {
    message.replies.forEach((reply, index) => {
      view += `\n[${index + 1}] ${reply.author} on ${reply.date}:\n${reply.content}\n`;
    });
  }

  view += `\nEnter R to reply or B to go back.`;
  return view;
};

// The MessageBoards BBS app
const MessageBoardsApp: BbsApp = {
  id: 'messageBoards',
  name: 'Message Boards',
  version: '1.0.0',
  description: 'Browse and post to message boards',
  author: 'BBS Admin',
  
  getWelcomeScreen() {
    return generateBoardsView();
  },
  
  handleCommand(screenId: string | null, command: string, session: BbsSession): CommandResult {
    console.log('handleCommand', screenId, command, session);
    const cmd = command.trim().toUpperCase();
    
    // Parse screen ID to get current context
    const path = screenId ? screenId.split(':') : ['home'];
    const currentArea = path[0];
    
    // Handle each screen area
    switch (currentArea) {
      case 'home':
        // From the board list screen
        if (cmd === 'B' || cmd === 'BACK') {
          return {
            screen: null,  // Return to main menu
            response: 'Returning to main menu...',
            refresh: true
          };
        }
        
        // Try to interpret as board selection
        const boardIndex = parseInt(cmd) - 1;
        if (!isNaN(boardIndex) && boardIndex >= 0 && boardIndex < messageBoards.length) {
          const boardId = messageBoards[boardIndex].id;
          return {
            screen: `board:${boardId}`,
            response: generateBoardView(boardId),
            refresh: true
          };
        }
        break;
        
      case 'board':
        // From a specific board
        const boardId = path[1];
        
        if (cmd === 'B' || cmd === 'BACK') {
          return {
            screen: 'home',
            response: generateBoardsView(),
            refresh: true
          };
        }
        
        if (cmd === 'N' || cmd === 'NEW') {
          return {
            screen: screenId,
            response: 'New message posting not implemented yet.',
            refresh: false
          };
        }
        
        // Try to interpret as message selection
        const messageIndex = parseInt(cmd) - 1;
        const boardMessages = messages[boardId] || [];
        if (!isNaN(messageIndex) && messageIndex >= 0 && messageIndex < boardMessages.length) {
          const messageId = boardMessages[messageIndex].id;
          return {
            screen: `message:${boardId}:${messageId}`,
            response: generateMessageView(boardId, messageId),
            refresh: true
          };
        }
        break;
        
      case 'message':
        // From a specific message
        if (path.length < 3) {
          return {
            screen: 'home',
            response: generateBoardsView(),
            refresh: true
          };
        }
        
        const msgBoardId = path[1];
        const messageId = path[2];
        
        console.log('message', msgBoardId, messageId);
        if (cmd === 'B' || cmd === 'BACK') {
          return {
            screen: `board:${msgBoardId}`,
            response: generateBoardView(msgBoardId),
            refresh: true
          };
        }
        
        if (cmd === 'R' || cmd === 'REPLY') {
          return {
            screen: screenId,
            response: 'Reply feature not implemented yet.',
            refresh: false
          };
        }
        break;
    }
    
    // Unknown command for current screen
    return {
      screen: screenId || 'home',
      response: `Invalid command: ${command}\nType HELP for available commands.`,
      refresh: false
    };
  },
  
  getHelp(screenId: string | null) {
    // Parse screen ID to get current context
    const path = screenId ? screenId.split(':') : ['home'];
    const currentArea = path[0];
    
    // Base help text
    let helpText = `
MESSAGE BOARDS HELP:
`;
    
    // Screen-specific help
    switch (currentArea) {
      case 'home':
        helpText += `
You are at the board list.
1-${messageBoards.length} - Select a board to browse
B - Go back to main menu
`;
        break;
        
      case 'board':
        helpText += `
You are viewing a message board.
1-n - Select a message to read
N - Post a new message
B - Go back to board list
`;
        break;
        
      case 'message':
        helpText += `
You are reading a message.
R - Reply to this message
B - Go back to the message board
`;
        break;
        
      default:
        helpText += `
Use number keys to navigate, B to go back.
`;
    }
    
    return helpText;
  },
  
  onInit() {
    console.log('Message Boards app initialized');
  }
};

// Export the app
export default MessageBoardsApp; 