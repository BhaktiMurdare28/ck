const mongoose = require('mongoose');

const StageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pct: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'active', 'done'], default: 'pending' }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  location: { type: String },
  supervisor: { type: String },
  client: { type: String },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  labour: { type: Number, default: 0 },
  material: { type: Number, default: 0 },
  misc: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['on-track', 'on-hold', 'delayed', 'completed'], default: 'on-track' },
  startDate: { type: String },
  endDate: { type: String },
  stages: [StageSchema],
  image: { type: String, default: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600' }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
