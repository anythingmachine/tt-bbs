import { NextResponse, NextRequest } from 'next/server';
import { createSession, getSession } from '../service';

// ASCII art for the BBS logo
const BBS_LOGO = `
░██████╗░░█████╗░██████╗░███████╗████████╗████████╗██╗░░░██╗░██████╗
██╔════╝░██╔══██╗██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝╚██╗░██╔╝██╔════╝
██║░░██╗░███████║██████╔╝█████╗░░░░░██║░░░░░░██║░░░░╚████╔╝░╚█████╗░
██║░░╚██╗██╔══██║██╔══██╗██╔══╝░░░░░██║░░░░░░██║░░░░░╚██╔╝░░░╚═══██╗
╚██████╔╝██║░░██║██║░░██║███████╗░░░██║░░░░░░██║░░░░░░██║░░░██████╔╝
░╚═════╝░╚═╝░░╚═╝╚═╝░░╚═╝╚══════╝░░░╚═╝░░░░░░╚═╝░░░░░░╚═╝░░░╚═════╝░

██████╗░██████╗░░██████╗░░░██████╗██╗░░░██╗░██████╗████████╗███████╗███╗░░░███╗
██╔══██╗██╔══██╗██╔════╝░░██╔════╝╚██╗░██╔╝██╔════╝╚══██╔══╝██╔════╝████╗░████║
██████╦╝██████╦╝╚█████╗░░░╚█████╗░░╚████╔╝░╚█████╗░░░░██║░░░█████╗░░██╔████╔██║
██╔══██╗██╔══██╗░╚═══██╗░░░╚═══██╗░░╚██╔╝░░░╚═══██╗░░░██║░░░██╔══╝░░██║╚██╔╝██║
██████╦╝██████╦╝██████╔╝░░██████╔╝░░░██║░░░██████╔╝░░░██║░░░███████╗██║░╚═╝░██║
╚═════╝░╚═════╝░╚═════╝░░░╚═════╝░░░░╚═╝░░░╚═════╝░░░░╚═╝░░░╚══════╝╚═╝░░░░░╚═╝
`;

// Generate the welcome message
function generateWelcomeScreen() {
  const divider = '▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄';

  return `${BBS_LOGO}

${divider}

WELCOME TO THE GARETTY'S BBS SYSTEM!

${divider}

               NODE: 1    USERS ONLINE: 1/1    SYSOP: GARETTY
                    RUNNING ON: NEXT.JS 15.2.2

${divider}

MAIN MENU:
  [1] MESSAGE BOARDS
  [2] FILE DOWNLOADS
  [3] ONLINE GAMES
  [4] USER PROFILES
  [5] CHAT ROOMS
  [X] LOGOFF

PLEASE MAKE A SELECTION:
`;
}

// Define simplified version for smaller screens
function generateSimplifiedWelcomeScreen() {
  return `
GARETTY'S BBS SYSTEM
=====================

MAIN MENU:
  [1] MESSAGE BOARDS
  [2] FILE DOWNLOADS
  [3] ONLINE GAMES
  [4] USER PROFILES
  [5] CHAT ROOMS
  [X] LOGOFF

PLEASE MAKE A SELECTION:
`;
}

export async function GET(request: NextRequest) {
  // Get the session ID from the query parameters
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const simplified = searchParams.get('simplified') === 'true';

  // Handle session management
  let session;

  if (sessionId) {
    // Try to get the existing session
    session = await getSession(sessionId);

    // If no valid session found but sessionId was provided, create one with that ID
    if (!session) {
      console.log(`Session ${sessionId} not found, creating new session with provided ID`);
      session = await createSession(sessionId);
    }
  } else {
    // No sessionId provided, create a brand new session
    session = await createSession();
  }

  // Generate the welcome screens
  const fullWelcomeText = generateWelcomeScreen();
  const simpleWelcomeText = generateSimplifiedWelcomeScreen();

  // Default to showing the full welcome text
  const defaultWelcomeText = simplified ? simpleWelcomeText : fullWelcomeText;

  // Return both full and simplified versions for responsive display
  return NextResponse.json({
    sessionId: session.sessionId,
    currentArea: 'main',
    defaultWelcomeText,
    fullWelcomeText,
    simpleWelcomeText,
    menuOptions: [
      { key: '1', label: 'MESSAGE BOARDS' },
      { key: '2', label: 'FILE DOWNLOADS' },
      { key: '3', label: 'ONLINE GAMES' },
      { key: '4', label: 'USER PROFILES' },
      { key: '5', label: 'CHAT ROOMS' },
      { key: 'X', label: 'LOGOFF' },
    ],
  });
}
