import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { getSession } from '../../terminal/service';
import User from '../../../models/User';

export async function GET(request: NextRequest) {
  try {
    // Get the session ID from query parameters
    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get('sessionId');
    
    // Validate input
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'SessionId is required' }, { status: 400 });
    }
    
    // Check if session exists but don't create one if it doesn't
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 });
    }
    
    // If no user is associated with this session
    if (!session.userId) {
      return NextResponse.json({ 
        success: true, 
        isLoggedIn: false,
        sessionId: session.sessionId,
        currentArea: session.currentArea,
        commandHistory: session.commandHistory
      });
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get user from database
    const user = await User.findById(session.userId);
    if (!user) {
      // User no longer exists in database
      return NextResponse.json({ 
        success: true, 
        isLoggedIn: false,
        sessionId: session.sessionId,
        currentArea: session.currentArea,
        commandHistory: session.commandHistory
      });
    }
    
    // Return user info with complete session data
    return NextResponse.json({
      success: true,
      isLoggedIn: true,
      sessionId: session.sessionId,
      currentArea: session.currentArea,
      commandHistory: session.commandHistory,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get current user' }, { status: 500 });
  }
} 