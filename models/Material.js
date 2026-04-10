const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  date: { type: String, default: '' },
  project: { type: String, default: '' },
  submittedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Material', MaterialSchema);
