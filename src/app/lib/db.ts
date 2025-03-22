import mongoose from 'mongoose';

// Define type for the cached connection
interface CachedConnection {
  conn: mongoose.Connection | null;
  promise: Promise<typeof mongoose> | null;
}

// Create a local cache instead of using the global object
const mongooseCache: CachedConnection = { conn: null, promise: null };

/**
 * Connect to MongoDB using the provided connection string
 * 
 * @returns Mongoose connection object
 */
export async function connectToDatabase() {
  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    mongooseCache.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      console.log('Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    const mongooseInstance = await mongooseCache.promise;
    mongooseCache.conn = mongooseInstance.connection;
    return mongooseCache.conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase() {
  if (mongooseCache.conn) {
    await mongoose.disconnect();
    mongooseCache.conn = null;
    mongooseCache.promise = null;
    console.log('Disconnected from MongoDB');
  }
} 