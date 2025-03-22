import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Check if session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      );
    }
    
    // Return session details
    return NextResponse.json({
      exists: true,
      currentArea: session.currentArea,
      historyLength: session.commandHistory.length
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
} 