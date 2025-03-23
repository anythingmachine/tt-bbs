import { BbsApp, CommandResult, BbsSession } from 'bbs-sdk';
import { installApp, uninstallApp, getInstalledNpmPackages } from '../appLoader';

// Define an extended interface for apps with helper methods
interface NpmAdminAppType extends BbsApp {
  showInstalledApps(): CommandResult;
  generateUninstallScreen(): string;
}

// NPM Admin App Implementation
const NpmAdminApp: NpmAdminAppType = {
  id: 'npm_admin',
  name: 'NPM App Manager',
  version: '1.0.0',
  description: 'Manage BBS apps from npm packages',
  author: 'BBS System',

  // Initialize the app
  onInit(): void {
    console.log('Initializing NPM Admin app...');
  },

  // Get the welcome screen
  getWelcomeScreen(): string {
    return `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

NPM APP MANAGER

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

This tool allows you to install, manage, and remove BBS apps
from npm packages.

COMMANDS:
LIST - List all installed npm apps
INSTALL - Install a new app from npm
UNINSTALL - Uninstall an npm app
HELP - Show help information
B or BACK - Return to main menu

Enter a command:
`;
  },

  // Handle commands
  handleCommand(screenId: string | null, command: string, session: BbsSession): CommandResult {
    const cmd = command.trim().toUpperCase();

    // If returning to main menu
    if (cmd === 'B' || cmd === 'BACK') {
      return {
        screen: null, // Return to main menu
        response: 'Returning to main menu...',
        refresh: true,
      };
    }

    // Check current screen
    switch (screenId) {
      case 'home':
        if (cmd === 'LIST') {
          return this.showInstalledApps();
        }

        if (cmd === 'INSTALL') {
          return {
            screen: 'install',
            response: `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

INSTALL FROM NPM

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Enter the name of the npm package you want to install:
(Format: bbs-app-yourappname)

Type B to go back.
`,
            refresh: true,
          };
        }

        if (cmd === 'UNINSTALL') {
          return {
            screen: 'uninstall',
            response: this.generateUninstallScreen(),
            refresh: true,
          };
        }
        break;

      case 'install':
        // Handle npm package installation
        if (cmd !== 'B' && cmd !== 'BACK') {
          const packageName = command.trim();

          // Set as installing
          if (!session.data) {
            session.data = {};
          }
          session.data.installingNpmApp = true;
          session.data.installMessage = `Installing npm package ${packageName}...`;

          // Schedule the installation
          installApp(packageName)
            .then((success) => {
              console.log(
                `Npm app installation completed for ${packageName}:`,
                success ? 'success' : 'failed'
              );
            })
            .catch((error) => {
              console.error(`Error installing npm app ${packageName}:`, error);
            });

          // Return immediate feedback to the user
          return {
            screen: 'install',
            response: `
Installation of npm package ${packageName} has been started.
This may take a few moments. When completed, the app will appear in the main menu.

Enter another npm package name to install another app, or B to go back:
`,
            refresh: true,
          };
        }
        break;

      case 'uninstall':
        // Check if it's a number selection
        const appIndex = parseInt(cmd) - 1;
        const npmPackages = getInstalledNpmPackages();

        if (!isNaN(appIndex) && appIndex >= 0 && appIndex < npmPackages.length) {
          const packageName = npmPackages[appIndex];

          // Confirm uninstall
          return {
            screen: `confirm-uninstall:${packageName}`,
            response: `
Are you sure you want to uninstall the npm package:
${packageName}

Type YES to confirm or B to cancel:
`,
            refresh: true,
          };
        }
        break;

      default:
        // Handle uninstall confirmation
        if (screenId?.startsWith('confirm-uninstall:')) {
          const packageName = screenId.split(':')[1];

          if (cmd === 'YES') {
            // Set as uninstalling
            if (!session.data) {
              session.data = {};
            }
            session.data.uninstallingNpmApp = true;

            // Schedule the uninstallation
            uninstallApp(packageName)
              .then((success) => {
                console.log(
                  `Npm app uninstallation completed for ${packageName}:`,
                  success ? 'success' : 'failed'
                );
              })
              .catch((error) => {
                console.error(`Error uninstalling npm app ${packageName}:`, error);
              });

            // Return to uninstall screen with feedback
            return {
              screen: 'uninstall',
              response: `
Uninstallation of npm package ${packageName} has been started.
${this.generateUninstallScreen()}
`,
              refresh: true,
            };
          }
        }
    }

    // Default: unknown command
    return {
      screen: screenId || 'home',
      response: `Unknown command: ${command}\nType HELP for available commands.`,
      refresh: false,
    };
  },

  // Get help text
  getHelp(screenId: string | null): string {
    let helpText = `
NPM APP MANAGER COMMANDS:
`;

    switch (screenId) {
      case 'home':
        helpText += `
LIST - Show all installed npm apps
INSTALL - Install a new app from npm
UNINSTALL - Remove an installed npm app
B or BACK - Return to main menu
`;
        break;

      case 'install':
        helpText += `
Enter an npm package name to install a BBS app.
Format: bbs-app-yourappname

B or BACK - Return to the main screen
`;
        break;

      case 'uninstall':
        helpText += `
Enter the number of the npm app you want to uninstall.

B or BACK - Return to the main screen
`;
        break;

      default:
        if (screenId?.startsWith('confirm-uninstall:')) {
          helpText += `
YES - Confirm uninstallation
B or BACK - Cancel uninstallation and return to the uninstall screen
`;
        } else {
          helpText += `
Commands vary depending on the current screen.
`;
        }
    }

    return helpText;
  },

  // Show installed apps
  showInstalledApps(): CommandResult {
    const npmPackages = getInstalledNpmPackages();

    let response = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

INSTALLED NPM APPS

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

`;

    if (npmPackages.length === 0) {
      response += `No npm apps are currently installed.\n\n`;
    } else {
      response += `The following npm apps are installed:\n\n`;

      npmPackages.forEach((packageName: string, index: number) => {
        response += `${index + 1}. ${packageName}\n`;
      });

      response += `\n`;
    }

    response += `Type INSTALL to install a new app, or B to go back.\n`;

    return {
      screen: 'home',
      response,
      refresh: true,
    };
  },

  // Generate uninstall screen
  generateUninstallScreen(): string {
    const npmPackages = getInstalledNpmPackages();

    let screen = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

UNINSTALL NPM APP

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

`;

    if (npmPackages.length === 0) {
      screen += `No npm apps are currently installed.\n\n`;
    } else {
      screen += `Select the number of the app you want to uninstall:\n\n`;

      npmPackages.forEach((packageName: string, index: number) => {
        screen += `${index + 1}. ${packageName}\n`;
      });

      screen += `\n`;
    }

    screen += `Type the number of the app to uninstall, or B to go back.\n`;

    return screen;
  },
};

export default NpmAdminApp;
