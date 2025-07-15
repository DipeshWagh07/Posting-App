// models/ScheduledPost.js
import mongoose from 'mongoose';

const scheduledPostSchema = new mongoose.Schema({
  text: { type: String, required: true },
  fileUrl: String,
  platforms: { type: Object, required: true },
  platformTokens: Object,
  selectedFacebookPageId: String,
  scheduledTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true } // Include virtuals when converting to plain objects
});

// Add a virtual for the frontend ID
scheduledPostSchema.virtual('id').get(function() {
  return this._id.toString();
});

const ScheduledPost = mongoose.model('ScheduledPost', scheduledPostSchema);

export default ScheduledPost;