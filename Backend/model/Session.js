const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    disease: String,
    intent: String,
    location: String,
    publicationsCount: Number,
    trialsCount: Number
  }
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  patientName: { type: String, default: '' },
  disease: { type: String, default: '' },
  location: { type: String, default: '' },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SessionSchema.pre('save', async function() {
  this.updatedAt = new Date();
});

// Keep only last 20 messages per session to control context size
SessionSchema.methods.getRecentMessages = function(limit = 20) {
  return this.messages.slice(-limit);
};

module.exports = mongoose.model('Session', SessionSchema);