import { NextResponse } from 'next/server';
import { getSession, updateSession } from '../../terminal/service';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { sessionId } = body;
    
    // Validate input
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'SessionId is required' }, { status: 400 });
    }
    
    // Check if session exists but don't create one if it doesn't
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 });
    }
    
    // If user is not logged in, no need to log out
    if (!session.userId) {
      return NextResponse.json({ success: true, message: 'User was not logged in' });
    }
    
    // Update session to remove user data
    const updatedSession = await updateSession(sessionId, {
      userId: undefined,
      username: undefined
    });
    
    if (!updatedSession) {
      return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
} 