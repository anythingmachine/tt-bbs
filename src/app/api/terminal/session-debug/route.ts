import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import Session from '../../../models/Session';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        message: 'SessionId is required'
      }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Get the session from the database (raw MongoDB approach)
    const rawSession = await Session.collection.findOne({ sessionId });
    
    // Also get it using Mongoose
    const modelSession = await Session.findOne({ sessionId });
    
    if (!rawSession && !modelSession) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      }, { status: 404 });
    }
    
    // Return details about the session
    return NextResponse.json({
      success: true,
      message: 'Session found',
      data: {
        raw: rawSession ? {
          exists: true,
          sessionId: rawSession.sessionId,
          currentArea: rawSession.currentArea,
          commandHistoryLength: rawSession.commandHistory?.length || 0,
          lastCommand: rawSession.commandHistory?.length > 0 
            ? rawSession.commandHistory[rawSession.commandHistory.length - 1] 
            : null,
          userId: rawSession.userId,
          lastActivity: rawSession.lastActivity,
          timestamps: {
            created: rawSession.createdAt,
            updated: rawSession.updatedAt
          }
        } : {
          exists: false
        },
        model: modelSession ? {
          exists: true,
          sessionId: modelSession.sessionId,
          currentArea: modelSession.currentArea,
          commandHistoryLength: modelSession.commandHistory?.length || 0,
          lastCommand: modelSession.commandHistory?.length > 0 
            ? modelSession.commandHistory[modelSession.commandHistory.length - 1] 
            : null,
          userId: modelSession.userId,
          lastActivity: modelSession.lastActivity,
          timestamps: {
            created: modelSession.createdAt,
            updated: modelSession.updatedAt
          }
        } : {
          exists: false
        }
      }
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check session state',
      error: (error as Error).message
    }, { status: 500 });
  }
} 