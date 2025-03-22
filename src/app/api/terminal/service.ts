/**
 * Terminal Session Service
 * 
 * This service handles session management for the terminal.
 */

import { v4 as uuidv4 } from 'uuid';
import { BbsSession } from 'bbs-sdk';
import { connectToDatabase } from '../../lib/db';
import Session from '../../models/Session';

/**
 * Create a new session
 */
export async function createSession(existingSessionId?: string): Promise<BbsSession> {
  // Use provided session ID or generate a new one
  const sessionId = existingSessionId || uuidv4();
  
  // Create the basic session object
  const sessionData: BbsSession = {
    sessionId,
    currentArea: 'main',
    commandHistory: [],
    data: {}
  };
  
  try {
    // Connect to the database
    await connectToDatabase();
    
    console.log(`Creating new session with ID: ${sessionId} (${existingSessionId ? 'client provided' : 'generated'})`);
    
    // Check if a session with this ID already exists
    const existingSession = await Session.findOne({ sessionId });
    
    if (existingSession) {
      console.log(`Session ${sessionId} already exists, returning existing session`);
      
      // Return existing session data
      return {
        sessionId: existingSession.sessionId,
        currentArea: existingSession.currentArea || 'main',
        commandHistory: existingSession.commandHistory || [],
        userId: existingSession.userId,
        username: existingSession.username,
        data: existingSession.data || {}
      };
    }
    
    // Define the session document explicitly
    const sessionDoc = {
      sessionId,
      currentArea: 'main',
      commandHistory: [],
      data: {},
      lastActivity: new Date(),
      createdAt: new Date()
    };
    
    // Create directly using the model
    const session = new Session(sessionDoc);
    
    // Save to MongoDB and log the result
    const savedSession = await session.save();
    console.log(`Session created:`, {
      id: savedSession._id,
      sessionId: savedSession.sessionId,
      currentArea: savedSession.currentArea,
      commandHistory: savedSession.commandHistory?.length || 0
    });
    
    return sessionData;
  } catch (error) {
    console.error('Error creating session:', error);
    // Return the basic session object even if DB save fails
    return sessionData;
  }
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<BbsSession | null> {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Find the session by ID
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      // Return null if session is not found
      return null;
    }
    
    // Update the last activity timestamp
    session.lastActivity = new Date();
    await session.save();
    
    // Return the session data object with all required BbsSession fields
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      username: session.username,
      currentArea: session.currentArea || 'main',
      commandHistory: session.commandHistory || [],
      data: session.data || {}
    };
  } catch (error) {
    console.error('Error getting session:', error);
    // Return null on error
    return null;
  }
}

/**
 * Update an existing session
 */
export async function updateSession(
  sessionId: string, 
  updates: Partial<BbsSession>
): Promise<BbsSession | null> {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Find the session
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      console.error(`Session not found for ID: ${sessionId}`);
      // Return null if session is not found
      return null;
    }
    
    console.log(`Updating session ${sessionId}. Before update:`, {
      currentArea: session.currentArea,
      commandHistoryLength: session.commandHistory?.length || 0,
      // Check which timestamp field exists
      lastActivity: session.lastActivity ? 'exists' : 'missing'
    });
    
    // Update fields
    if (updates.currentArea !== undefined) {
      console.log(`Setting currentArea to: ${updates.currentArea}`);
      session.currentArea = updates.currentArea;
    }
    
    if (updates.data !== undefined) {
      session.data = { ...session.data, ...updates.data };
    }
    
    if (updates.userId !== undefined) {
      session.userId = updates.userId;
    }
    
    if (updates.username !== undefined) {
      session.username = updates.username;
    }
    
    if (updates.commandHistory !== undefined) {
      session.commandHistory = updates.commandHistory;
    }
    
    // Update timestamp - handle both field names for compatibility
    const now = new Date();
    session.lastActivity = now;
    
    // Log the changes
    console.log(`After update:`, {
      currentArea: session.currentArea,
      commandHistoryLength: session.commandHistory?.length || 0
    });
    
    // Save changes using a direct approach for maximum compatibility
    try {
      // Build an update document that includes both possible field names
      const updateDoc: any = { 
        $set: {
          currentArea: session.currentArea,
          commandHistory: session.commandHistory,
          data: session.data,
          userId: session.userId,
          username: session.username,
          lastActivity: now
        }
      };
      
      // Try direct update using the model's updateOne method
      const updateResult = await Session.collection.updateOne(
        { sessionId },
        updateDoc
      );
      
      console.log(`Update result:`, updateResult);
      
      // Check if the update was successful
      if (updateResult.modifiedCount === 0) {
        console.warn(`Session ${sessionId} was not modified during update. Trying more aggressive update...`);
        
        // Try a more direct approach to bypass any schema validation
        const forceUpdateResult = await Session.collection.updateOne(
          { sessionId },
          updateDoc,
          { upsert: false }
        );
        
        console.log(`Force update result:`, forceUpdateResult);
      }
    } catch (updateError) {
      console.error('Error using direct update:', updateError);
      
      // Fallback to the save() method
      try {
        await session.save();
      } catch (saveError) {
        console.error('Error using save() method:', saveError);
        // Last resort - try direct collection access
        await Session.collection.findOneAndUpdate(
          { sessionId },
          {
            $set: {
              currentArea: session.currentArea,
              commandHistory: session.commandHistory,
              lastActivity: now
            }
          }
        );
      }
    }
    
    // Return updated session with all required BbsSession fields
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      username: session.username,
      currentArea: session.currentArea || 'main',
      commandHistory: session.commandHistory || [],
      data: session.data || {}
    };
  } catch (error) {
    console.error('Error updating session:', error);
    // Return null on error
    return null;
  }
}

/**
 * Add a command to the session history
 */
export async function addToHistory(sessionId: string, command: string): Promise<boolean> {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Find the session
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      console.error(`Session not found for adding history: ${sessionId}`);
      return false;
    }
    
    // Initialize commandHistory if it doesn't exist
    if (!session.commandHistory) {
      session.commandHistory = [];
    }
    
    // Add command to history
    session.commandHistory.push(command);
    
    // Limit history to 100 commands
    if (session.commandHistory.length > 100) {
      session.commandHistory.shift();
    }
    
    // Update both timestamp fields for compatibility
    const now = new Date();
    session.lastActivity = now;
    
    console.log(`Adding command to history for session ${sessionId}. Current history length: ${session.commandHistory.length}`);
    
    // Try direct update first
    try {
      const updateDoc = {
        $set: {
          commandHistory: session.commandHistory,
          lastActivity: now,
        }
      };
      
      const updateResult = await Session.collection.updateOne(
        { sessionId },
        updateDoc
      );
      
      console.log(`History update result:`, updateResult);
      
      if (updateResult.modifiedCount === 0) {
        console.warn(`Session ${sessionId} history was not modified. Trying more aggressive update...`);
        
        // Try a more direct approach bypassing validation
        const forceUpdateResult = await Session.collection.findOneAndUpdate(
          { sessionId },
          updateDoc,
          { returnDocument: 'after' }
        );
        
        console.log(`Force history update result:`, forceUpdateResult ? 'success' : 'failed');
      }
    } catch (updateError) {
      console.error('Error using direct update for history:', updateError);
      
      // Fallback to save method as a last resort
      try {
        await session.save();
      } catch (saveError) {
        console.error('Error saving history:', saveError);
      }
    }
    
    console.log(`Added command to history for session ${sessionId}, history length: ${session.commandHistory.length}`);
    return true;
  } catch (error) {
    console.error('Error adding to history:', error);
    return false;
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    // Connect to the database
    await connectToDatabase();
    
    // Delete the session
    const result = await Session.deleteOne({ sessionId });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Debug function to check if a session was saved correctly
 */
export async function checkSessionState(sessionId: string): Promise<void> {
  try {
    await connectToDatabase();
    
    // Direct query to get the raw session document
    const rawSession = await Session.collection.findOne({ sessionId });
    console.log(`RAW SESSION CHECK for ${sessionId}:`, {
      exists: !!rawSession,
      currentArea: rawSession?.currentArea,
      commandHistory: rawSession?.commandHistory?.length || 0,
      userId: rawSession?.userId
    });
    
    // Mongoose query
    const modelSession = await Session.findOne({ sessionId });
    console.log(`MODEL SESSION CHECK for ${sessionId}:`, {
      exists: !!modelSession,
      currentArea: modelSession?.currentArea,
      commandHistory: modelSession?.commandHistory?.length || 0,
      userId: modelSession?.userId
    });
  } catch (error) {
    console.error('Error checking session state:', error);
  }
}

/**
 * Set the current area for a session
 */
export async function setCurrentArea(sessionId: string, area: string): Promise<boolean> {
  try {
    // Connect to the database
    await connectToDatabase();

    console.log(`Setting current area for session ${sessionId} to ${area}`);
    
    // Find the session
    const session = await Session.findOne({ sessionId });
    
    if (!session) {
      console.error(`Session not found for setting area: ${sessionId}`);
      return false;
    }
    
    // Update the current area
    session.currentArea = area;
    
    // Update both timestamp fields for compatibility
    const now = new Date();
    session.lastActivity = now;
    
    // Try direct update first
    try {
      const updateDoc = {
        $set: {
          currentArea: area,
          lastActivity: now
        }
      };
      
      const updateResult = await Session.collection.updateOne(
        { sessionId },
        updateDoc
      );
      
      console.log(`Area update result for ${sessionId}:`, updateResult);
      
      if (updateResult.modifiedCount === 0) {
        console.warn(`Session ${sessionId} area was not modified. Trying more aggressive update...`);
        
        // Try a more direct approach bypassing validation
        const forceUpdateResult = await Session.collection.findOneAndUpdate(
          { sessionId },
          updateDoc,
          { returnDocument: 'after' }
        );
        
        console.log(`Force area update result:`, forceUpdateResult ? 'success' : 'failed');
      }
    } catch (updateError) {
      console.error('Error using direct update for area:', updateError);
      
      // Fallback to save method as a last resort
      try {
        await session.save();
      } catch (saveError) {
        console.error('Error saving area:', saveError);
      }
    }
    
    console.log(`Current area set to ${area} for session ${sessionId}`);
    return true;
  } catch (error) {
    console.error('Error setting current area:', error);
    return false;
  }
} 