const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  ipAddress: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

ContactSchema.index({ email: 1, subject: 1, createdAt: -1 });

module.exports = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
