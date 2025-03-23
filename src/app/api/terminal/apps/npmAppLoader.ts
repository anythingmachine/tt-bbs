import fs from 'fs';
import path from 'path';
import { BbsApp } from 'bbs-sdk';

// Track installed npm packages
const installedNpmPackages: string[] = [];

/**
 * Check if an object implements the BbsApp interface
 */
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
      hasGetHelp: typeof obj.getHelp === 'function',
    });
  }

  return hasRequiredProps;
}

/**
 * Scan node_modules for packages with the 'bbs-app' keyword
 */
export async function scanNpmPackages(): Promise<string[]> {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const foundPackages: string[] = [];

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules directory not found');
    return foundPackages;
  }

  try {
    // Get all directories in node_modules
    const directories = fs
      .readdirSync(nodeModulesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Check each directory for bbs-app keyword
    for (const dir of directories) {
      const packageJsonPath = path.join(nodeModulesPath, dir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

          // Check for bbs-app keyword
          if (
            packageJson.keywords &&
            Array.isArray(packageJson.keywords) &&
            packageJson.keywords.includes('bbs-app')
          ) {
            foundPackages.push(dir);
          }
        } catch (error) {
          console.error(`Error parsing package.json for ${dir}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning node_modules:', error);
  }

  return foundPackages;
}

/**
 * Load an app from an npm package
 */
export async function loadNpmApp(packageName: string): Promise<BbsApp | null> {
  try {
    const packagePath = path.join(process.cwd(), 'node_modules', packageName);

    // Check if package exists
    if (!fs.existsSync(packagePath)) {
      console.error(`Package ${packageName} not found in node_modules`);
      console.error(`Checked path: ${packagePath}`);
      // List content of node_modules to help debug
      try {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');
        const dirs = fs
          .readdirSync(nodeModulesPath)
          .filter((dir) => fs.statSync(path.join(nodeModulesPath, dir)).isDirectory());
        console.log(`Available packages in node_modules: ${dirs.join(', ')}`);
      } catch (listError: any) {
        console.error(`Error listing node_modules: ${listError.message}`);
      }
      return null;
    }

    // Find the main file by checking package.json
    const packageJsonPath = path.join(packagePath, 'package.json');
    let mainFile = 'index.js'; // Default main file

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        console.log(`Package.json content: ${packageJsonContent}`);
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.main) {
          mainFile = packageJson.main;
          console.log(`Found main file in package.json: ${mainFile}`);
        } else {
          console.log(`No main file specified in package.json, using default: ${mainFile}`);
        }
      } catch (error: any) {
        console.error(`Error reading package.json for ${packageName}: ${error.message}`);
      }
    } else {
      console.warn(`package.json not found at ${packageJsonPath}, using default main: ${mainFile}`);
    }

    // List files in package directory to help debug
    try {
      const files = fs.readdirSync(packagePath);
      console.log(`Files in package directory: ${files.join(', ')}`);
    } catch (listError: any) {
      console.error(`Error listing files in package directory: ${listError.message}`);
    }

    // Resolve the full path to the main file
    const mainFilePath = path.join(packagePath, mainFile);
    console.log(`Loading npm package from: ${mainFilePath}`);
    console.log(`File exists: ${fs.existsSync(mainFilePath)}`);

    // Handle Windows path format correctly for imports
    const mainFilePathForImport = mainFilePath.replace(/\\/g, '/');

    // Check if the module is ESM (ES Modules) or CommonJS
    let isEsm = false;
    try {
      const fileContent = fs.readFileSync(mainFilePath, 'utf8');
      isEsm =
        fileContent.includes('export default') ||
        fileContent.includes('export {') ||
        fileContent.includes('export const') ||
        fileContent.includes('export function');
      console.log(`Module appears to be ${isEsm ? 'ESM' : 'CommonJS'}`);
    } catch (readError: any) {
      console.warn(`Could not read file content to determine module type: ${readError.message}`);
    }

    // Try both import methods for compatibility
    let app;
    try {
      // Try dynamic import first
      console.log(`Attempting dynamic import of ${mainFilePathForImport}`);
      app = await import(/* webpackIgnore: true */ mainFilePathForImport);
      console.log(`Dynamic import successful for ${packageName}`);
    } catch (importError: any) {
      console.log(`Dynamic import failed: ${importError.message}`);
      console.log(`Trying require for ${mainFilePath}`);

      // Fallback to require
      try {
        app = require(mainFilePath);
        console.log(`Require successful for ${packageName}`);
      } catch (requireError: any) {
        console.error(`Require also failed: ${requireError.message}`);

        // If both methods fail, try a direct global require
        try {
          console.log(`Trying global require for ${packageName}`);
          app = require(packageName);
          console.log(`Global require successful for ${packageName}`);
        } catch (globalRequireError: any) {
          console.error(`All import methods failed for ${packageName}`);
          throw new Error(
            `Failed to load module: ${importError.message} | ${requireError.message} | ${globalRequireError.message}`
          );
        }
      }
    }

    console.log(`App loaded. Type: ${typeof app}`);
    if (app && typeof app === 'object') {
      console.log(`App has default export: ${Boolean(app.default)}`);
      console.log(`Available keys: ${Object.keys(app).join(', ')}`);
    }

    const bbsApp = app.default || app;
    console.log(`BbsApp result type: ${typeof bbsApp}`);
    console.log(`Available keys: ${Object.keys(bbsApp.default).join(', ')}`);

    // Track this npm package as installed
    if (!installedNpmPackages.includes(packageName)) {
      installedNpmPackages.push(packageName);
    }

    return bbsApp.default;
  } catch (error: any) {
    console.error(`Error loading npm package ${packageName}: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

/**
 * Get all installed npm packages
 */
export function getInstalledNpmPackages(): string[] {
  return [...installedNpmPackages];
}
