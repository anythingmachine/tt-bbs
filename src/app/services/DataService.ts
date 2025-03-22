import { connectToDatabase } from '../lib/db';
import User from '../models/User';
import Session from '../models/Session';
import KeyValue from '../models/KeyValue';
import { BbsSession, BbsUser, BbsStorage } from 'bbs-sdk';

/**
 * DataService class
 * 
 * This service provides database access for BBS apps with controlled access
 * to prevent direct database manipulation.
 */
export class DataService {
  // The ID of the app using this service
  private appId: string;
  
  /**
   * Create a new DataService instance
   * 
   * @param appId The ID of the app using this service
   */
  constructor(appId: string) {
    this.appId = appId;
  }

  /**
   * Get the current user from their session
   * 
   * @param session The current BBS session
   * @returns The user object or null if not logged in
   */
  async getCurrentUser(session: BbsSession): Promise<BbsUser | null> {
    if (!session.userId) {
      return null;
    }

    await connectToDatabase();
    
    const user = await User.findById(session.userId);
    if (!user) return null;
    
    // Return only the fields defined in BbsUser
    return {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      joinDate: user.joinDate.toISOString(),
      lastLogin: user.lastLogin.toISOString()
    };
  }

  /**
   * Update the session data
   * 
   * @param sessionId The session ID
   * @param updates The updates to apply
   * @returns The updated session or null if not found
   */
  async updateSession(sessionId: string, updates: Partial<BbsSession>): Promise<BbsSession | null> {
    await connectToDatabase();

    const session = await Session.findOne({ sessionId });
    if (!session) return null;
    
    // Only allow updating certain fields
    if (updates.currentArea) session.currentArea = updates.currentArea;
    if (updates.data) {
      // Only allow updating app's own data namespace
      session.data[this.appId] = {
        ...(session.data[this.appId] || {}),
        ...(updates.data[this.appId] || {})
      };
    }
    
    // Update last activity time
    session.lastActivity = new Date();
    
    // Save the session
    await session.save();
    
    // Convert to BbsSession format
    return {
      sessionId: session.sessionId,
      userId: session.userId?.toString(),
      username: session.username,
      currentArea: session.currentArea,
      commandHistory: session.commandHistory,
      data: session.data
    };
  }

  /**
   * Get a storage interface for the app
   * 
   * @returns A storage interface for key-value operations
   */
  getStorage(): BbsStorage {
    return {
      getData: async (key: string): Promise<any | null> => {
        await connectToDatabase();
        
        const item = await KeyValue.findOne({ 
          appId: this.appId, 
          key 
        });
        
        return item ? item.value : null;
      },
      
      setData: async (key: string, data: any): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          await KeyValue.updateOne(
            { appId: this.appId, key },
            { 
              $set: { 
                value: data,
                appId: this.appId,
                key
              } 
            },
            { upsert: true }
          );
          
          return true;
        } catch (error) {
          console.error('Error saving data:', error);
          return false;
        }
      },
      
      deleteData: async (key: string): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          const result = await KeyValue.deleteOne({ 
            appId: this.appId, 
            key 
          });
          
          return result.deletedCount > 0;
        } catch (error) {
          console.error('Error deleting data:', error);
          return false;
        }
      }
    };
  }

  /**
   * Get a user-specific storage interface
   * 
   * @param userId The user ID to store data for
   * @returns A storage interface for user-specific key-value operations
   */
  getUserStorage(userId: string): BbsStorage {
    return {
      getData: async (key: string): Promise<any | null> => {
        await connectToDatabase();
        
        const item = await KeyValue.findOne({ 
          appId: this.appId, 
          key,
          userId
        });
        
        return item ? item.value : null;
      },
      
      setData: async (key: string, data: any): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          await KeyValue.updateOne(
            { appId: this.appId, key, userId },
            { 
              $set: { 
                value: data,
                appId: this.appId,
                key,
                userId
              } 
            },
            { upsert: true }
          );
          
          return true;
        } catch (error) {
          console.error('Error saving user data:', error);
          return false;
        }
      },
      
      deleteData: async (key: string): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          const result = await KeyValue.deleteOne({ 
            appId: this.appId, 
            key,
            userId
          });
          
          return result.deletedCount > 0;
        } catch (error) {
          console.error('Error deleting user data:', error);
          return false;
        }
      }
    };
  }

  /**
   * Get a namespaced storage interface
   * 
   * @param namespace The namespace to use
   * @returns A storage interface for namespaced key-value operations
   */
  getNamespacedStorage(namespace: string): BbsStorage {
    return {
      getData: async (key: string): Promise<any | null> => {
        await connectToDatabase();
        
        const item = await KeyValue.findOne({ 
          appId: this.appId, 
          key,
          namespace
        });
        
        return item ? item.value : null;
      },
      
      setData: async (key: string, data: any): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          await KeyValue.updateOne(
            { appId: this.appId, key, namespace },
            { 
              $set: { 
                value: data,
                appId: this.appId,
                key,
                namespace
              } 
            },
            { upsert: true }
          );
          
          return true;
        } catch (error) {
          console.error('Error saving namespaced data:', error);
          return false;
        }
      },
      
      deleteData: async (key: string): Promise<boolean> => {
        try {
          await connectToDatabase();
          
          const result = await KeyValue.deleteOne({ 
            appId: this.appId, 
            key,
            namespace
          });
          
          return result.deletedCount > 0;
        } catch (error) {
          console.error('Error deleting namespaced data:', error);
          return false;
        }
      }
    };
  }
} 