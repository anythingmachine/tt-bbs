import { NextResponse, NextRequest } from 'next/server';
import {
  getSession,
  updateSession,
  addToHistory,
  createSession,
  checkSessionState,
  setCurrentArea,
} from '../service';
import {
  loadInstalledApps,
  getAllApps,
  installGithubApp,
  uninstallGithubApp,
  getInstalledGithubAppUrls,
  installApp,
  uninstallApp,
  getInstalledNpmPackages,
} from '../apps/appLoader';
import { BbsApp, CommandResult, BbsSession, CommandRequest } from 'bbs-sdk';

// Make sure apps are loaded when the module is first loaded
console.log('Command route: Initial loading of apps...');
loadInstalledApps();
console.log(`Command route: Initial load complete`);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, command } = body as CommandRequest;

    if (!sessionId || !command) {
      return NextResponse.json({ error: 'Session ID and command are required' }, { status: 400 });
    }

    // Get the session or create a new one with the provided ID if it doesn't exist
    let session = await getSession(sessionId);
    if (!session) {
      // Create a new session with the provided ID
      console.log(`Command route: Creating new session with provided ID ${sessionId}`);
      session = await createSession(sessionId);

      // Double-check to make sure the session was created with the right ID
      if (session.sessionId !== sessionId) {
        // This should not happen since we're using the provided ID, but just in case
        console.error(
          `Session created with different ID than provided: ${session.sessionId} vs ${sessionId}`
        );
        return NextResponse.json(
          {
            error: 'Session error, please refresh the page',
            newSessionId: session.sessionId,
          },
          { status: 400 }
        );
      }
    }

    console.log(
      `Processing command '${command}' for session ${sessionId} in area ${session.currentArea}`
    );

    // Check session before processing
    await checkSessionState(sessionId);

    // Get current apps registry for this request
    const currentApps = getAllApps();
    console.log(`Processing command with ${Object.keys(currentApps).length} available apps`);

    // Process command based on current area
    const result = await processCommand(session.currentArea, command, session, currentApps);

    // Add command to history
    await addToHistory(sessionId, command);

    console.log(
      `Command processed. Session area: ${session.currentArea}, Result area: ${result.area}`
    );

    // If area changed, update it
    if (result.area && result.area !== session.currentArea) {
      console.log(
        `Area changed from ${session.currentArea} to ${result.area} for session ${sessionId}`
      );

      // Use the dedicated setCurrentArea function instead of direct session update
      await setCurrentArea(sessionId, result.area);

      // Check session state after area update
      await checkSessionState(sessionId);
    }

    // Return response
    return NextResponse.json({
      success: true,
      message: result.response || 'Command executed successfully',
      data: {
        ...result,
        session: {
          id: sessionId,
          currentArea: result.area || session.currentArea, // Return the latest area
          commandHistory: session.commandHistory || [],
        },
      },
    });
  } catch (error) {
    console.error('Error processing command:', error);
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}

// Process command based on current area
async function processCommand(
  currentArea: string,
  command: string,
  session: BbsSession,
  apps: Record<string, BbsApp>
): Promise<CommandResult> {
  const cmd = command.trim().toUpperCase();

  // Common commands for all areas
  if (cmd === 'HELP') {
    return {
      screen: currentArea.includes(':') ? currentArea.split(':')[1] : null,
      area: currentArea,
      response: generateHelpText(currentArea, apps),
      refresh: false,
    };
  }

  if (cmd === 'MAIN' || cmd === 'MENU') {
    await updateSession(session.sessionId, { currentArea: 'main' });
    return {
      screen: null,
      area: 'main',
      response: generateMainMenu(apps),
      refresh: true,
    };
  }

  if (cmd === 'EXIT' || cmd === 'QUIT' || cmd === 'X' || cmd === 'LOGOFF') {
    return {
      screen: null,
      area: currentArea,
      response: `Logging off...\nThank you for visiting the BBS!\nPress any key to reconnect...\n`,
      refresh: true,
    };
  }

  if (cmd === 'DEBUG') {
    // Special debug command to show available apps
    const appIds = Object.keys(apps);
    return {
      screen: null,
      area: currentArea,
      response: `Available apps (${appIds.length}):\n${appIds.join('\n')}\n\nCurrent area: ${currentArea}`,
      refresh: false,
    };
  }

  // Check for app installation commands (admin features)
  if (cmd.startsWith('INSTALL GITHUB ') || cmd.startsWith('INSTALL-GITHUB ')) {
    const githubUrl = command.substring(cmd.startsWith('INSTALL-GITHUB ') ? 15 : 14).trim();

    if (!githubUrl || !githubUrl.includes('github.com')) {
      return {
        screen: null,
        area: currentArea,
        response: `Invalid GitHub URL. Format: INSTALL GITHUB https://github.com/owner/repo`,
        refresh: false,
      };
    }

    // Show installing message
    await updateSession(session.sessionId, {
      data: {
        ...session.data,
        installingApp: true,
        installMessage: `Installing app from ${githubUrl}...`,
      },
    });

    // Attempt to install the app
    const installedApp = await installGithubApp(githubUrl);

    if (!installedApp) {
      await updateSession(session.sessionId, {
        data: {
          ...session.data,
          installingApp: false,
          installMessage: null,
        },
      });

      return {
        screen: null,
        area: currentArea,
        response: `Failed to install app from ${githubUrl}. Check the URL and try again.`,
        refresh: false,
      };
    }

    // Update session and show success message
    await updateSession(session.sessionId, {
      data: {
        ...session.data,
        installingApp: false,
        installMessage: null,
      },
    });

    // If we're in the main menu, refresh it to show the new app
    if (currentArea === 'main') {
      return {
        screen: null,
        area: 'main',
        response: `Successfully installed ${installedApp.name}!\n\n${generateMainMenu()}`,
        refresh: true,
      };
    }

    return {
      screen: null,
      area: currentArea,
      response: `Successfully installed ${installedApp.name}!\nType MENU to return to the main menu to use the app.`,
      refresh: false,
    };
  }

  if (cmd.startsWith('UNINSTALL GITHUB ') || cmd.startsWith('UNINSTALL-GITHUB ')) {
    const githubUrl = command.substring(cmd.startsWith('UNINSTALL-GITHUB ') ? 17 : 16).trim();

    if (!githubUrl || !githubUrl.includes('github.com')) {
      return {
        screen: null,
        area: currentArea,
        response: `Invalid GitHub URL. Format: UNINSTALL GITHUB https://github.com/owner/repo`,
        refresh: false,
      };
    }

    // Attempt to uninstall the app
    const uninstalled = uninstallGithubApp(githubUrl);

    if (!uninstalled) {
      return {
        screen: null,
        area: currentArea,
        response: `No app installed from ${githubUrl}.`,
        refresh: false,
      };
    }

    // If we're in the main menu, refresh it to remove the app
    if (currentArea === 'main') {
      return {
        screen: null,
        area: 'main',
        response: `Successfully uninstalled app from ${githubUrl}!\n\n${generateMainMenu()}`,
        refresh: true,
      };
    }

    return {
      screen: null,
      area: currentArea,
      response: `Successfully uninstalled app from ${githubUrl}!\nType MENU to return to the main menu.`,
      refresh: false,
    };
  }

  if (cmd === 'LIST GITHUB APPS' || cmd === 'LIST-GITHUB-APPS') {
    const githubUrls = getInstalledGithubAppUrls();

    if (githubUrls.length === 0) {
      return {
        screen: null,
        area: currentArea,
        response: `No GitHub apps are currently installed.\nUse INSTALL GITHUB [URL] to install an app from GitHub.`,
        refresh: false,
      };
    }

    let response = `Installed GitHub Apps:\n\n`;

    githubUrls.forEach((url, index) => {
      response += `${index + 1}. ${url}\n`;
    });

    return {
      screen: null,
      area: currentArea,
      response,
      refresh: false,
    };
  }

  // Check if we're in an app area
  const [appId, appScreen] = parseAreaString(currentArea);

  // If we're in an app, delegate command handling to that app
  if (appId && apps[appId]) {
    return await handleAppCommand(apps[appId], appId, appScreen, cmd, session);
  }

  // Handle main menu commands
  if (currentArea === 'main') {
    return await handleMainMenuCommands(cmd, session, apps);
  }

  // If we reach here, the area is unknown
  return {
    screen: null,
    area: currentArea,
    response: `Unknown command: ${command}\nType HELP for available commands.\n`,
    refresh: false,
  };
}

// Parse area string (format: "app:screenId" or just "main")
function parseAreaString(area: string | undefined): [string | null, string | null] {
  // If area is undefined or null, return null values
  if (!area) {
    return [null, null];
  }

  // If area doesn't contain a colon, it's not an app area
  if (!area.includes(':')) {
    return [null, null];
  }

  const [appId, screenId] = area.split(':');
  return [appId, screenId];
}

// Handle commands within an app
async function handleAppCommand(
  app: BbsApp,
  appId: string,
  currentScreen: string | null,
  command: string,
  session: BbsSession
): Promise<CommandResult> {
  // If user wants to go back to main menu from an app
  if (command === 'B' || command === 'BACK') {
    await updateSession(session.sessionId, { currentArea: 'main' });
    return {
      screen: null,
      area: 'main',
      response: generateMainMenu(),
      refresh: true,
    };
  }

  // Delegate command to the app's command handler
  try {
    console.log(`Delegating command to app ${appId}, screen: ${currentScreen}`);
    const result = app.handleCommand(currentScreen, command, session);

    // If the app wants to change screens within itself
    if (result.screen !== currentScreen) {
      const newArea =
        result.screen === null
          ? 'main' // null screen means exit to main menu
          : `${appId}:${result.screen}`;

      await updateSession(session.sessionId, { currentArea: newArea });

      // If returning to main menu, show the main menu
      if (newArea === 'main') {
        return {
          screen: null,
          area: 'main',
          response: generateMainMenu(),
          refresh: true,
        };
      }

      return {
        screen: result.screen,
        area: newArea,
        response: result.response,
        refresh: result.refresh || false,
      };
    }

    // Otherwise just return the result
    return {
      screen: result.screen,
      area: `${appId}:${currentScreen}`,
      response: result.response,
      refresh: result.refresh || false,
    };
  } catch (error) {
    console.error(`Error in app ${appId}:`, error);
    return {
      screen: null,
      area: `${appId}:${currentScreen}`,
      response: `An error occurred in the ${app.name} app.\nType B to go back to the main menu.\n`,
      refresh: false,
    };
  }
}

// Generate main menu text including all installed apps
function generateMainMenu(apps?: Record<string, BbsApp>) {
  // Use passed apps or get the latest
  const currentApps = apps || getAllApps();
  const appIds = Object.keys(currentApps);

  console.log(`Generating main menu with ${appIds.length} apps`);

  // Create menu header
  let menu = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

MAIN MENU

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

`;

  // Add each installed app to the menu
  if (appIds.length === 0) {
    menu += `No apps are currently installed.\n\n`;
    menu += `Type INSTALL GITHUB [URL] to install an app from GitHub.\n`;
    menu += `Type DEBUG to see system information.\n`;
  } else {
    appIds.forEach((appId, index) => {
      const app = currentApps[appId];
      menu += `[${index + 1}] ${app.name.toUpperCase()}${app.source ? ' (GitHub)' : ''}\n`;
    });
  }

  // Add logoff option
  menu += `\n[X] LOGOFF\n\nPLEASE MAKE A SELECTION:`;

  return menu;
}

// Generate help text based on current area
function generateHelpText(currentArea: string, apps?: Record<string, BbsApp>) {
  // Use passed apps or get the latest
  const currentApps = apps || getAllApps();

  // Common commands
  let helpText = `
COMMON COMMANDS:
HELP - Show this help text
MAIN or MENU - Return to main menu
EXIT, QUIT, X, or LOGOFF - Exit the BBS
DEBUG - Show system information

GITHUB APP COMMANDS:
INSTALL GITHUB [URL] - Install an app from GitHub
UNINSTALL GITHUB [URL] - Uninstall a GitHub app
LIST GITHUB APPS - List all installed GitHub apps

`;

  // If we're in an app, get app-specific help
  const [appId, screenId] = parseAreaString(currentArea);
  if (appId && currentApps[appId]) {
    helpText += currentApps[appId].getHelp(screenId);
    return helpText;
  }

  // Main menu help
  if (currentArea === 'main') {
    const appIds = Object.keys(currentApps);
    if (appIds.length === 0) {
      helpText += `
MAIN MENU COMMANDS:
No apps are currently available.
`;
    } else {
      helpText += `
MAIN MENU COMMANDS:
1-${appIds.length} - Select an app from the menu
`;
    }
  }

  return helpText;
}

// Handle commands from the main menu
async function handleMainMenuCommands(
  cmd: string,
  session: BbsSession,
  apps?: Record<string, BbsApp>
): Promise<CommandResult> {
  // Use passed apps or get the latest
  const currentApps = apps || getAllApps();

  // Check if the command is a number
  const appIndex = parseInt(cmd) - 1;
  const appIds = Object.keys(currentApps);

  console.log(
    `Handling main menu command: ${cmd}, App index: ${appIndex}, Available apps: ${appIds.length}`
  );

  // If the number corresponds to an app, launch it
  if (!isNaN(appIndex) && appIndex >= 0 && appIndex < appIds.length) {
    const appId = appIds[appIndex];
    const app = currentApps[appId];

    console.log(`Launching app: ${appId} (${app.name})`);

    // Set new area with app and default screen
    const newArea = `${appId}:home`;
    await updateSession(session.sessionId, { currentArea: newArea });

    // Call the user enter hook if implemented
    if (typeof app.onUserEnter === 'function' && session.userId) {
      app.onUserEnter(session.userId, session);
    }

    // Get app's welcome screen
    const welcome = app.getWelcomeScreen();

    return {
      screen: 'home',
      area: newArea,
      response: welcome,
      refresh: true,
    };
  }

  // Invalid selection
  return {
    screen: null,
    area: 'main',
    response: `Invalid selection: ${cmd}\nPlease select a valid option (1-${appIds.length || 0}) or type HELP for assistance.\n`,
    refresh: false,
  };
}
