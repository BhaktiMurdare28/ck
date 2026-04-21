const mongoose = require('mongoose');

const MeasurementSchema = new mongoose.Schema({
  project: { type: String, default: '' },
  projectType: { type: String, default: 'Building' },
  date: { type: String, required: true },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: String, default: '' },
  submittedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Measurement', MeasurementSchema);
