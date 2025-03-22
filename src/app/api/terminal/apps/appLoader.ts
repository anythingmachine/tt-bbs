import fs from 'fs';
import path from 'path';
import { BbsApp, CommandResult } from 'bbs-sdk';
// Import built-in apps directly
import MessageBoardsApp from './built-in/messageBoards';
import HangmanApp from './built-in/hangman';
import GitHubAdminApp from './built-in/githubAdmin';

// Import GitHub app loader
import { loadAppFromGithub, refreshGithubApps } from './githubLoader';

// Map of loaded BBS apps by ID
const appRegistry: Record<string, BbsApp> = {};

// Keep track of installed GitHub app URLs
const installedGithubApps: string[] = [];

/**
 * Load all installed BBS apps 
 * This searches for apps in node_modules with the 'bbs-app' keyword
 */
export function loadInstalledApps(): Record<string, BbsApp> {
  try {
    console.log('Loading BBS apps...');
    
    // Clear the registry first to avoid duplicate entries when reloading
    Object.keys(appRegistry).forEach(key => delete appRegistry[key]);
    
    // Load external apps from the bbs-apps directory
    loadExternalApps();
    
    // Load built-in apps directly (more reliable in Next.js than dynamic loading)
    loadBuiltInAppsDirect();
    
    // Refresh any GitHub apps that were previously loaded
    refreshGithubApps().then(apps => {
      apps.forEach(app => {
        // Register or update the app
        appRegistry[app.id] = app;
        console.log(`Refreshed GitHub app: ${app.name} (${app.id})`);
      });
    }).catch(error => {
      console.error('Error refreshing GitHub apps:', error);
    });
    
    // Log the final app registry
    const appIds = Object.keys(appRegistry);
    console.log(`Total BBS apps loaded: ${appIds.length}`);
    console.log(`Available apps: ${appIds.join(', ')}`);
    
    return { ...appRegistry };
  } catch (error) {
    console.error('Error loading BBS apps:', error);
    return { ...appRegistry }; // Return the current registry even if there was an error
  }
}

/**
 * Load apps from external directories
 */
function loadExternalApps() {
  // In a production app, we would discover all installed packages with the 'bbs-app' keyword
  // For now, we'll look for BBS apps in a predefined directory
  const appDirectory = path.join(process.cwd(), 'bbs-apps');
  console.log(`Looking for apps in: ${appDirectory}`);
  
  // Check if directory exists
  if (fs.existsSync(appDirectory)) {
    // Read all subdirectories in the app directory
    const appFolders = fs.readdirSync(appDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`Found ${appFolders.length} potential app folders: ${appFolders.join(', ')}`);
    
    // Load each app
    for (const folder of appFolders) {
      try {
        // Try to load the app
        const appPath = path.join(appDirectory, folder);
        console.log(`Attempting to load app from: ${appPath}`);
        
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const app = require(appPath);
        
        // Check if the app implements the BbsApp interface
        if (isValidBbsApp(app.default || app)) {
          const bbsApp = app.default || app;
          
          // Register the app
          appRegistry[bbsApp.id] = bbsApp;
          
          // Call onInit if implemented
          if (typeof bbsApp.onInit === 'function') {
            bbsApp.onInit();
          }
          
          console.log(`Loaded BBS app: ${bbsApp.name} (${bbsApp.id}) v${bbsApp.version}`);
        } else {
          console.warn(`Invalid BBS app format in folder: ${folder}`);
        }
      } catch (error) {
        console.error(`Error loading BBS app from folder ${folder}:`, error);
      }
    }
  } else {
    console.log('BBS apps directory not found. No external apps loaded.');
    // Create the directory for future app installations
    fs.mkdirSync(appDirectory, { recursive: true });
  }
}

/**
 * Load built-in apps directly using imports instead of dynamic loading
 * This is more reliable with Next.js than the dynamic require method
 */
function loadBuiltInAppsDirect() {
  console.log('Loading built-in apps directly...');
  
  // Add built-in apps to the registry
  try {
    // Message Boards
    if (isValidBbsApp(MessageBoardsApp)) {
      appRegistry[MessageBoardsApp.id] = MessageBoardsApp;
      
      if (typeof MessageBoardsApp.onInit === 'function') {
        MessageBoardsApp.onInit();
      }
      
      console.log(`Loaded built-in BBS app: ${MessageBoardsApp.name} (${MessageBoardsApp.id}) v${MessageBoardsApp.version}`);
    } else {
      console.warn('Message Boards app is not a valid BBS app');
    }
    
    // Hangman
    if (isValidBbsApp(HangmanApp)) {
      appRegistry[HangmanApp.id] = HangmanApp;
      
      if (typeof HangmanApp.onInit === 'function') {
        HangmanApp.onInit();
      }
      
      console.log(`Loaded built-in BBS app: ${HangmanApp.name} (${HangmanApp.id}) v${HangmanApp.version}`);
    } else {
      console.warn('Hangman app is not a valid BBS app');
    }
    
    // GitHub Admin
    if (isValidBbsApp(GitHubAdminApp)) {
      appRegistry[GitHubAdminApp.id] = GitHubAdminApp;
      
      if (typeof GitHubAdminApp.onInit === 'function') {
        GitHubAdminApp.onInit();
      }
      
      console.log(`Loaded built-in BBS app: ${GitHubAdminApp.name} (${GitHubAdminApp.id}) v${GitHubAdminApp.version}`);
    } else {
      console.warn('GitHub Admin app is not a valid BBS app');
    }
  } catch (error) {
    console.error('Error loading built-in apps directly:', error);
  }
}

/**
 * Type guard to validate that an object implements the BbsApp interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidBbsApp(obj: any): obj is BbsApp {
  if (!obj) {
    console.warn('App object is null or undefined');
    return false;
  }
  
  const hasRequiredProps = 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.author === 'string' &&
    typeof obj.getWelcomeScreen === 'function' &&
    typeof obj.handleCommand === 'function' &&
    typeof obj.getHelp === 'function';
  
  if (!hasRequiredProps) {
    console.warn('App missing required properties:', {
      hasId: typeof obj.id === 'string',
      hasName: typeof obj.name === 'string',
      hasVersion: typeof obj.version === 'string',
      hasDescription: typeof obj.description === 'string',
      hasAuthor: typeof obj.author === 'string',
      hasGetWelcomeScreen: typeof obj.getWelcomeScreen === 'function',
      hasHandleCommand: typeof obj.handleCommand === 'function',
      hasGetHelp: typeof obj.getHelp === 'function'
    });
  }
  
  return hasRequiredProps;
}

/**
 * Install an app from a GitHub repository
 */
export async function installGithubApp(githubUrl: string): Promise<BbsApp | null> {
  try {
    console.log(`Installing app from GitHub: ${githubUrl}`);
    
    // Check if already installed
    if (installedGithubApps.includes(githubUrl)) {
      console.log(`GitHub app already installed: ${githubUrl}`);
      
      // Try to refresh it
      for (const appId in appRegistry) {
        const app = appRegistry[appId];
        if (app.source === githubUrl) {
          return app;
        }
      }
    }
    
    // Load the app from GitHub
    const app = await loadAppFromGithub(githubUrl);
    
    if (!app) {
      console.error(`Failed to load app from GitHub: ${githubUrl}`);
      return null;
    }
    
    // Register the app
    appRegistry[app.id] = app;
    
    // Remember that this GitHub app is installed
    if (!installedGithubApps.includes(githubUrl)) {
      installedGithubApps.push(githubUrl);
    }
    
    // Call onInit if implemented
    if (typeof app.onInit === 'function') {
      app.onInit();
    }
    
    console.log(`Successfully installed GitHub app: ${app.name} (${app.id})`);
    
    return app;
  } catch (error) {
    console.error('Error installing GitHub app:', error);
    return null;
  }
}

/**
 * Uninstall a GitHub app
 */
export function uninstallGithubApp(githubUrl: string): boolean {
  try {
    console.log(`Uninstalling GitHub app: ${githubUrl}`);
    
    // Find apps with this source
    let uninstalled = false;
    for (const appId in appRegistry) {
      const app = appRegistry[appId];
      if (app.source === githubUrl) {
        // Remove from registry
        delete appRegistry[appId];
        uninstalled = true;
        console.log(`Removed GitHub app: ${app.name} (${app.id})`);
      }
    }
    
    // Remove from installed list
    const index = installedGithubApps.indexOf(githubUrl);
    if (index !== -1) {
      installedGithubApps.splice(index, 1);
      uninstalled = true;
    }
    
    return uninstalled;
  } catch (error) {
    console.error('Error uninstalling GitHub app:', error);
    return false;
  }
}

/**
 * Install a BBS app from an npm package
 * This would be called by an admin tool to add apps to the BBS
 */
export async function installApp(packageName: string): Promise<boolean> {
  // In a real implementation, this would use npm/yarn to install the package
  // and then load it into the registry
  console.log(`Installing BBS app: ${packageName}`);
  
  // This is a placeholder for the actual installation logic
  return true;
}

/**
 * Uninstall a BBS app
 */
export async function uninstallApp(appId: string): Promise<boolean> {
  // Implementation would remove the package and unregister it
  if (appRegistry[appId]) {
    delete appRegistry[appId];
    return true;
  }
  return false;
}

/**
 * Get a specific app by ID
 */
export function getApp(appId: string): BbsApp | undefined {
  return appRegistry[appId];
}

/**
 * Get all installed apps
 */
export function getAllApps(): Record<string, BbsApp> {
  return { ...appRegistry };
}

/**
 * Get all installed GitHub app URLs
 */
export function getInstalledGithubAppUrls(): string[] {
  return [...installedGithubApps];
}

// Export types for convenience
export type { BbsApp, CommandResult };

// Initialize by loading apps
console.log('Initializing app loader...');
const loadedApps = loadInstalledApps();
console.log(`App loading complete. App count: ${Object.keys(loadedApps).length}`); 