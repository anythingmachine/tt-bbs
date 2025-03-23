import Session, { SessionDoc, SessionModel } from '../models/Session';
import { connectToDatabase } from './database';

/**
 * Get a session by its session ID
 * If no session exists with this ID, creates a new one
 * @param sessionId The unique session identifier
 * @returns The session object (existing or newly created)
 */
export async function getSession(sessionId: string): Promise<SessionModel> {
  await connectToDatabase();

  try {
    // Try to find the session
    let session = await Session.findOne({ sessionId });

    if (!session) {
      // If session doesn't exist, create a new one
      console.log(`Session ${sessionId} not found, creating new session`);
      session = new Session({
        sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        data: {},
      });

      await session.save();
    } else {
      // Update last active timestamp
      await Session.updateOne({ sessionId }, { $set: { lastActivity: new Date() } });
    }

    return new SessionModel(session as unknown as SessionDoc);
  } catch (error) {
    console.error('Error in getSession:', error);

    // Even if there's an error, create a minimal session object and return it
    // This ensures the function never fails completely
    const fallbackSession = new Session({
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      data: {},
    });

    try {
      await fallbackSession.save();
    } catch (saveError) {
      console.error('Failed to save fallback session:', saveError);
      // Continue even if save fails - we'll return an unsaved model
    }

    return new SessionModel(fallbackSession as unknown as SessionDoc);
  }
}

/**
 * Create a new session
 * @param sessionId The unique session identifier
 * @param ipAddress Optional IP address of the client
 * @param userAgent Optional user agent of the client
 * @returns The created session or null if creation failed
 */
export async function createSession(
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SessionModel | null> {
  await connectToDatabase();

  try {
    const newSession = new Session({
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
      data: {},
    });

    await newSession.save();
    return new SessionModel(newSession as unknown as SessionDoc);
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Update a session with user information
 * @param sessionId The unique session identifier
 * @param userData The user data to associate with the session
 * @returns The updated session or null if update failed
 */
export async function updateSession(
  sessionId: string,
  userData: {
    userId?: string;
    username?: string;
    displayName?: string;
    role?: string;
  }
): Promise<SessionModel | null> {
  await connectToDatabase();

  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          ...userData,
          lastActivity: new Date(),
        },
      },
      { new: true }
    );

    if (!session) {
      return null;
    }

    return new SessionModel(session as unknown as SessionDoc);
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
}

/**
 * Update session data (for app-specific storage)
 * @param sessionId The unique session identifier
 * @param data The data to store in the session
 * @returns The updated session or null if update failed
 */
export async function updateSessionData(
  sessionId: string,
  data: Record<string, any>
): Promise<SessionModel | null> {
  await connectToDatabase();

  try {
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return null;
    }

    // Merge existing data with new data
    const updatedData = { ...session.data, ...data };

    const updatedSession = await Session.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          data: updatedData,
          lastActivity: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedSession) {
      return null;
    }

    return new SessionModel(updatedSession as unknown as SessionDoc);
  } catch (error) {
    console.error('Error updating session data:', error);
    return null;
  }
}

/**
 * Delete a session
 * @param sessionId The unique session identifier
 * @returns True if successfully deleted, false otherwise
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  await connectToDatabase();

  try {
    const result = await Session.deleteOne({ sessionId });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Clean up expired sessions (older than the specified days)
 * @param days Number of days after which sessions are considered expired
 * @returns Number of deleted sessions
 */
export async function cleanupExpiredSessions(days = 30): Promise<number> {
  await connectToDatabase();

  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - days);

    const result = await Session.deleteMany({
      lastActivity: { $lt: expirationDate },
    });

    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}
