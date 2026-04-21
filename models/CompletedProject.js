const mongoose = require('mongoose');

const CompletedProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String },
  completedYear: { type: Number },
  image: { type: String, default: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600' }
}, { timestamps: true });

module.exports = mongoose.model('CompletedProject', CompletedProjectSchema);
