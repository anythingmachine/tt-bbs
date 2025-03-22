import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { getSession, updateSession, createSession } from '../../terminal/service';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { username, password, sessionId } = body;
    
    // Validate inputs
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Look up user
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }
    
    // Compare password (using passwordHash field from User model)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
    }
    
    // Update user's last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Handle session (create if not provided)
    let session;
    if (sessionId) {
      // If sessionId provided, try to get existing session
      session = await getSession(sessionId);
      
      // If session not found, create a new one with the provided ID
      if (!session) {
        console.log(`Login: Session ${sessionId} not found, creating new session with provided ID`);
        session = await createSession(sessionId);
      }
    } else {
      // Create new session without specific ID
      session = await createSession();
    }
    
    // Update session with user info
    const updatedSession = await updateSession(session.sessionId, {
      userId: user._id.toString(),
      username: user.username
    });
    
    if (!updatedSession) {
      return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
    }
    
    // Return user info and session ID, including full session object
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      currentArea: updatedSession.currentArea,
      commandHistory: updatedSession.commandHistory,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
} 