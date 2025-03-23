import bcrypt from 'bcryptjs';
import User, { UserDoc, UserModel } from '../models/User';
import { connectToDatabase } from './database';

/**
 * Get a user by their username
 * @param username The username to look up
 * @returns The user object or null if not found
 */
export async function getUserByUsername(username: string): Promise<UserModel | null> {
  await connectToDatabase();

  try {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return null;
    }

    return new UserModel(user as unknown as UserDoc);
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
}

/**
 * Get a user by their ID
 * @param userId The user ID to look up
 * @returns The user object or null if not found
 */
export async function getUserById(userId: string): Promise<UserModel | null> {
  await connectToDatabase();

  try {
    const user = await User.findById(userId);

    if (!user) {
      return null;
    }

    return new UserModel(user as unknown as UserDoc);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get a user by their email
 * @param email The email to look up
 * @returns The user object or null if not found
 */
export async function getUserByEmail(email: string): Promise<UserModel | null> {
  await connectToDatabase();

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return null;
    }

    return new UserModel(user as unknown as UserDoc);
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Create a new user
 * @param userData The user data to create
 * @returns The created user or null if creation failed
 */
export async function createUser(userData: {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  role?: 'user' | 'admin';
}): Promise<UserModel | null> {
  await connectToDatabase();

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    // Create the new user
    const newUser = new User({
      username: userData.username.toLowerCase(),
      displayName: userData.displayName,
      email: userData.email?.toLowerCase(),
      passwordHash,
      role: userData.role || 'user',
      joinDate: new Date(),
      lastLogin: new Date(),
    });

    await newUser.save();
    return new UserModel(newUser as unknown as UserDoc);
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

/**
 * Update a user's last login time
 * @param userId The ID of the user to update
 * @returns True if update successful, false otherwise
 */
export async function updateLastLogin(userId: string): Promise<boolean> {
  await connectToDatabase();

  try {
    const result = await User.updateOne({ _id: userId }, { $set: { lastLogin: new Date() } });

    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Error updating last login:', error);
    return false;
  }
}

/**
 * Verify a user's password
 * @param user The user object
 * @param password The password to verify
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(user: UserModel, password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, user.passwordHash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Update a user's password
 * @param userId The ID of the user to update
 * @param newPassword The new password
 * @returns True if update successful, false otherwise
 */
export async function updatePassword(userId: string, newPassword: string): Promise<boolean> {
  await connectToDatabase();

  try {
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await User.updateOne({ _id: userId }, { $set: { passwordHash } });

    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
}
