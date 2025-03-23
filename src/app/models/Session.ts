import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

export interface SessionDoc {
  _id: ObjectId;
  sessionId: string;
  userId?: string;
  username?: string;
  displayName?: string;
  role?: string;
  currentArea: string;
  commandHistory: string[];
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  data?: Record<string, string>;
}

export class SessionModel {
  id: string;
  sessionId: string;
  userId?: string;
  username?: string;
  displayName?: string;
  role?: string;
  currentArea: string;
  commandHistory: string[];
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  data?: Record<string, string>;

  constructor(doc: SessionDoc) {
    this.id = doc._id.toString();
    this.sessionId = doc.sessionId;
    this.userId = doc.userId;
    this.username = doc.username;
    this.displayName = doc.displayName;
    this.role = doc.role;
    this.currentArea = doc.currentArea;
    this.commandHistory = doc.commandHistory;
    this.createdAt = doc.createdAt;
    this.lastActivity = doc.lastActivity;
    this.ipAddress = doc.ipAddress;
    this.userAgent = doc.userAgent;
    this.data = doc.data;
  }

  /**
   * Check if the session is associated with a logged-in user
   */
  isAuthenticated(): boolean {
    return !!this.userId;
  }

  /**
   * Get user information from the session
   */
  getUserInfo() {
    if (!this.isAuthenticated()) {
      return null;
    }

    return {
      id: this.userId,
      username: this.username,
      displayName: this.displayName,
      role: this.role,
    };
  }
}

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    displayName: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      required: false,
    },
    currentArea: {
      type: String,
      default: 'main',
      required: true,
    },
    commandHistory: {
      type: [String],
      default: [],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create indexes for efficient querying
sessionSchema.index({ userId: 1 });
sessionSchema.index({ lastActivity: 1 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export default Session;
