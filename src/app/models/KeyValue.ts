import mongoose from 'mongoose';

// Define the KeyValue schema for a flexible key-value store
const keyValueSchema = new mongoose.Schema({
  // The app that owns this data
  appId: {
    type: String,
    required: true,
    trim: true,
  },
  // The key for this data
  key: {
    type: String,
    required: true,
    trim: true,
  },
  // The value can be any valid JSON data
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  // The user this data belongs to (optional)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  // Namespace for additional organization (optional)
  namespace: {
    type: String,
    required: false,
    trim: true,
  },
  // TTL for automatic expiration (optional)
  expiresAt: {
    type: Date,
    required: false,
    index: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Create a compound index for faster lookups
keyValueSchema.index({ appId: 1, key: 1, userId: 1, namespace: 1 }, { unique: true });
keyValueSchema.index({ appId: 1, namespace: 1 });
keyValueSchema.index({ appId: 1, userId: 1 });

// Create the model if it doesn't already exist
const KeyValue = mongoose.models.KeyValue || mongoose.model('KeyValue', keyValueSchema);

export default KeyValue; 