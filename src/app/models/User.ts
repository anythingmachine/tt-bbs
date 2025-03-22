import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export interface UserDoc {
  _id: ObjectId;
  username: string;
  displayName: string;
  email?: string;
  passwordHash: string;
  role: 'user' | 'admin';
  joinDate: Date;
  lastLogin?: Date;
  profileSettings?: {
    colorTheme?: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export class UserModel {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  passwordHash: string;
  role: 'user' | 'admin';
  joinDate: Date;
  lastLogin?: Date;
  profileSettings?: {
    colorTheme?: string;
    avatarUrl?: string;
    bio?: string;
  };

  constructor(doc: UserDoc) {
    this.id = doc._id.toString();
    this.username = doc.username;
    this.displayName = doc.displayName;
    this.email = doc.email;
    this.passwordHash = doc.passwordHash;
    this.role = doc.role;
    this.joinDate = doc.joinDate;
    this.lastLogin = doc.lastLogin;
    this.profileSettings = doc.profileSettings;
  }

  /**
   * Convert to a public representation of the user that's safe to return to clients
   * Excludes sensitive fields like passwordHash
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      email: this.email,
      role: this.role,
      joinDate: this.joinDate,
      lastLogin: this.lastLogin,
      profileSettings: this.profileSettings
    };
  }

  /**
   * Convert to a basic representation for session storage
   */
  toSessionData() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      role: this.role
    };
  }
}

// Define the User schema based on the BbsUser interface
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  joinDate: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  profileSettings: {
    colorTheme: { type: String },
    avatarUrl: { type: String },
    bio: { type: String }
  }
});

// Create the model if it doesn't already exist
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User; 