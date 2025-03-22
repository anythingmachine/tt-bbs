import { BbsApp, CommandResult, BbsSession } from 'bbs-sdk';
import { 
  installGithubApp, 
  uninstallGithubApp, 
  getInstalledGithubAppUrls 
} from '../appLoader';

// Define an extended interface for apps with helper methods
interface GitHubAdminAppType extends BbsApp {
  showInstalledApps(): CommandResult;
  generateUninstallScreen(): string;
}

// GitHub Admin App Implementation
const GitHubAdminApp: GitHubAdminAppType = {
  id: 'github_admin',
  name: 'GitHub App Manager',
  version: '1.0.0',
  description: 'Manage BBS apps from GitHub repositories',
  author: 'BBS System',
  
  // Get the welcome screen
  getWelcomeScreen(): string {
    return `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

GITHUB APP MANAGER

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

This tool allows you to install, manage, and remove BBS apps
directly from GitHub repositories.

COMMANDS:
LIST - List all installed GitHub apps
INSTALL - Install a new app from GitHub
UNINSTALL - Uninstall a GitHub app
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
        screen: null,  // Return to main menu
        response: 'Returning to main menu...',
        refresh: true
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

INSTALL FROM GITHUB

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Enter the GitHub URL of the BBS app you want to install:
(Format: https://github.com/owner/repo)

Type B to go back.
`,
            refresh: true
          };
        }
        
        if (cmd === 'UNINSTALL') {
          return {
            screen: 'uninstall',
            response: this.generateUninstallScreen(),
            refresh: true
          };
        }
        break;
        
      case 'install':
        // If not a back command, treat as GitHub URL
        if (cmd.startsWith('HTTP')) {
          // Set as installing
          if (!session.data) {
            session.data = {};
          }
          session.data.installingApp = true;
          session.data.installMessage = `Installing app from ${command}...`;
          
          // We need to handle the async nature of installGithubApp
          // Since BbsApp.handleCommand doesn't support async/await, we'll
          // provide immediate feedback and let the system handle the installation
          
          // Schedule the installation
          installGithubApp(command)
            .then(app => {
              console.log(`App installation completed for ${command}:`, app ? 'success' : 'failed');
            })
            .catch(error => {
              console.error(`Error installing app from ${command}:`, error);
            });
          
          // Return immediate feedback to the user
          return {
            screen: 'install',
            response: `
Installation of app from ${command} has been started.
This may take a few moments. When completed, the app will appear in the main menu.

Enter another GitHub URL to install another app, or B to go back:
`,
            refresh: true
          };
        }
        break;
        
      case 'uninstall':
        // Check if it's a number selection
        const appIndex = parseInt(cmd) - 1;
        const githubUrls = getInstalledGithubAppUrls();
        
        if (!isNaN(appIndex) && appIndex >= 0 && appIndex < githubUrls.length) {
          const githubUrl = githubUrls[appIndex];
          
          // Confirm uninstall
          return {
            screen: `confirm-uninstall:${githubUrl}`,
            response: `
Are you sure you want to uninstall the app from:
${githubUrl}

Type YES to confirm or B to cancel:
`,
            refresh: true
          };
        }
        break;
        
      default:
        // Check if we're in a confirmation screen
        if (screenId?.startsWith('confirm-uninstall:')) {
          const githubUrl = screenId.substring('confirm-uninstall:'.length);
          
          if (cmd === 'YES') {
            const uninstalled = uninstallGithubApp(githubUrl);
            
            if (uninstalled) {
              return {
                screen: 'home',
                response: `
App from ${githubUrl} has been uninstalled successfully.

${this.getWelcomeScreen()}
`,
                refresh: true
              };
            } else {
              return {
                screen: 'home',
                response: `
Failed to uninstall app from ${githubUrl}.
The app may have already been uninstalled.

${this.getWelcomeScreen()}
`,
                refresh: true
              };
            }
          }
          
          // If not YES, return to uninstall screen
          if (cmd !== 'B' && cmd !== 'BACK') {
            return {
              screen: 'uninstall',
              response: `
Uninstall cancelled.

${this.generateUninstallScreen()}
`,
              refresh: true
            };
          }
        }
    }
    
    // Default handler for unrecognized commands
    return {
      screen: screenId || 'home',
      response: `Unknown command: ${command}\nType HELP for available commands.`,
      refresh: false
    };
  },
  
  // Get help text
  getHelp(screenId: string | null): string {
    let helpText = `
GITHUB APP MANAGER COMMANDS:
`;
    
    switch (screenId) {
      case 'home':
        helpText += `
LIST - Show all installed GitHub apps
INSTALL - Install a new app from GitHub
UNINSTALL - Remove an installed GitHub app
B or BACK - Return to main menu
`;
        break;
        
      case 'install':
        helpText += `
Enter a GitHub repository URL to install a BBS app.
Format: https://github.com/owner/repo

B or BACK - Return to the main screen
`;
        break;
        
      case 'uninstall':
        helpText += `
Enter the number of the GitHub app you want to uninstall.

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
  
  // Optional initialization hook
  onInit() {
    console.log('GitHub Admin app initialized');
  },
  
  // Helper methods
  showInstalledApps(): CommandResult {
    const githubUrls = getInstalledGithubAppUrls();
    
    if (githubUrls.length === 0) {
      return {
        screen: 'home',
        response: `
No GitHub apps are currently installed.

Use the INSTALL command to add apps from GitHub.

Press any key to continue.
`,
        refresh: true
      };
    }
    
    let response = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

INSTALLED GITHUB APPS

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

`;
    
    githubUrls.forEach((url, index) => {
      response += `${index + 1}. ${url}\n`;
    });
    
    response += `
Type any key to return to the main screen.
`;
    
    return {
      screen: 'home',
      response,
      refresh: true
    };
  },
  
  generateUninstallScreen(): string {
    const githubUrls = getInstalledGithubAppUrls();
    
    if (githubUrls.length === 0) {
      return `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

UNINSTALL GITHUB APP

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

No GitHub apps are currently installed.

Press any key to return to the main screen.
`;
    }
    
    let screen = `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

UNINSTALL GITHUB APP

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

Select a GitHub app to uninstall:

`;
    
    githubUrls.forEach((url, index) => {
      screen += `${index + 1}. ${url}\n`;
    });
    
    screen += `
Enter the number of the app to uninstall or B to go back:
`;
    
    return screen;
  }
};

// Export the app
export default GitHubAdminApp; 