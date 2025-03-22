import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { getSession, updateSession, createSession } from '../../terminal/service';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { username, password, displayName, email, sessionId } = body;
    
    // Validate inputs
    if (!username || !password || !displayName || !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username, password, display name, and email are required' 
      }, { status: 400 });
    }
    
    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      }, { status: 400 });
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username already exists' 
      }, { status: 400 });
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email already in use' 
      }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = new User({
      username,
      passwordHash: hashedPassword,
      displayName,
      email,
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    // Save user to database
    await newUser.save();
    
    // Handle session (create if not provided)
    let session;
    if (sessionId) {
      // If sessionId provided, try to get existing session
      session = await getSession(sessionId);
      
      // If session not found, create a new one with the provided ID
      if (!session) {
        console.log(`Register: Session ${sessionId} not found, creating new session with provided ID`);
        session = await createSession(sessionId);
      }
    } else {
      // Create new session without specific ID
      session = await createSession();
    }
    
    // Update session with user info
    const updatedSession = await updateSession(session.sessionId, {
      userId: newUser._id.toString(),
      username: newUser.username
    });
    
    if (!updatedSession) {
      return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
    }
    
    // Return success with user data and session ID, including full session data
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      currentArea: updatedSession.currentArea,
      commandHistory: updatedSession.commandHistory,
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
} 