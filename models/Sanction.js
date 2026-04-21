const mongoose = require('mongoose');

const SanctionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project: { type: String, required: true },
  authority: { type: String },
  date: { type: String },
  expiry: { type: String },
  status: { type: String, enum: ['approved', 'pending', 'expiring', 'expired'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Sanction', SanctionSchema);
