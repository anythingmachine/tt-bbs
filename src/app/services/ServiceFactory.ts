import { BbsStorage, BbsUtils } from 'bbs-sdk';
import { DataService } from './DataService';

/**
 * Service Factory
 *
 * This factory creates and provides services to BBS apps.
 * It ensures that apps only have access to the services they need
 * with proper isolation and security.
 */
export class ServiceFactory {
  /**
   * Create a DataService for a BBS app
   *
   * @param appId The ID of the app requesting the service
   * @returns A DataService instance scoped to the app
   */
  static createDataService(appId: string): DataService {
    return new DataService(appId);
  }

  /**
   * Create a Storage service for a BBS app
   *
   * @param appId The ID of the app requesting the service
   * @returns A BbsStorage instance scoped to the app
   */
  static createStorageService(appId: string): BbsStorage {
    const dataService = new DataService(appId);
    return dataService.getStorage();
  }

  /**
   * Create a user-specific Storage service for a BBS app
   *
   * @param appId The ID of the app requesting the service
   * @param userId The ID of the user
   * @returns A BbsStorage instance scoped to the app and user
   */
  static createUserStorageService(appId: string, userId: string): BbsStorage {
    const dataService = new DataService(appId);
    return dataService.getUserStorage(userId);
  }

  /**
   * Create a namespaced Storage service for a BBS app
   *
   * @param appId The ID of the app requesting the service
   * @param namespace The namespace to use
   * @returns A BbsStorage instance scoped to the app and namespace
   */
  static createNamespacedStorageService(appId: string, namespace: string): BbsStorage {
    const dataService = new DataService(appId);
    return dataService.getNamespacedStorage(namespace);
  }

  /**
   * Create a utility service for BBS apps
   *
   * @returns Common utility functions
   */
  static createUtilsService(): BbsUtils {
    return {
      formatDate: (date: Date | string, format?: string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;

        // Default format: YYYY-MM-DD HH:MM:SS
        if (!format) {
          return d.toISOString().replace('T', ' ').substring(0, 19);
        }

        // Simple format replacement
        return format
          .replace('YYYY', d.getFullYear().toString())
          .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
          .replace('DD', d.getDate().toString().padStart(2, '0'))
          .replace('HH', d.getHours().toString().padStart(2, '0'))
          .replace('mm', d.getMinutes().toString().padStart(2, '0'))
          .replace('ss', d.getSeconds().toString().padStart(2, '0'));
      },

      generateAsciiArt: (text: string): string => {
        // A simple ASCII art generator (could be enhanced with a proper ASCII art library)
        const lines = [
          `╔═${'═'.repeat(text.length)}═╗`,
          `║ ${text} ║`,
          `╚═${'═'.repeat(text.length)}═╝`,
        ];

        return lines.join('\n');
      },

      createSeparator: (char = '═', width = 80): string => char.repeat(width),
    };
  }
}
