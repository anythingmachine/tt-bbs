import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Define installation states
export type InstallationStatus = 'pending' | 'installing' | 'success' | 'failed';

// Track installation status
const installationStatus: Record<string, InstallationStatus> = {};

/**
 * Install an npm package via npm/yarn
 */
export async function installNpmPackage(packageName: string): Promise<boolean> {
  try {
    console.log(`Installing npm package: ${packageName}`);

    // Update status
    installationStatus[packageName] = 'installing';

    // Run npm install
    const installCmd = `npm install ${packageName}`;
    const { stdout, stderr } = await execAsync(installCmd, { cwd: process.cwd() });

    if (stderr && !stderr.includes('npm WARN')) {
      console.error(`Error installing package ${packageName}:`, stderr);
      installationStatus[packageName] = 'failed';
      return false;
    }

    console.log(`Successfully installed package ${packageName}`);
    console.log(stdout);

    // Check if package was actually installed
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', packageName);
    if (!fs.existsSync(nodeModulesPath)) {
      console.error(`Package ${packageName} was not found after installation`);
      installationStatus[packageName] = 'failed';
      return false;
    }

    // Update status
    installationStatus[packageName] = 'success';
    return true;
  } catch (error) {
    console.error(`Error installing npm package ${packageName}:`, error);
    installationStatus[packageName] = 'failed';
    return false;
  }
}

/**
 * Uninstall an npm package
 */
export async function uninstallNpmPackage(packageName: string): Promise<boolean> {
  try {
    console.log(`Uninstalling npm package: ${packageName}`);

    // Run npm uninstall
    const uninstallCmd = `npm uninstall ${packageName}`;
    const { stdout, stderr } = await execAsync(uninstallCmd, { cwd: process.cwd() });

    if (stderr && !stderr.includes('npm WARN')) {
      console.error(`Error uninstalling package ${packageName}:`, stderr);
      return false;
    }

    console.log(`Successfully uninstalled package ${packageName}`);
    console.log(stdout);

    // Remove from status tracking
    delete installationStatus[packageName];

    return true;
  } catch (error) {
    console.error(`Error uninstalling npm package ${packageName}:`, error);
    return false;
  }
}

/**
 * Get installation status for a package
 */
export function getPackageInstallationStatus(packageName: string): InstallationStatus {
  return installationStatus[packageName] || 'pending';
}
