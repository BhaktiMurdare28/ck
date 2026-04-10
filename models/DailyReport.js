const mongoose = require('mongoose');

const DailyReportSchema = new mongoose.Schema({
  project: { type: String, default: '' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  date: { type: String, required: true },
  weather: { type: String, default: '' },
  stage: { type: String, default: '' },
  workDone: { type: String, default: '' },
  issues: { type: String, default: '' },
  photos: [{ type: String }],
  // Expense fields — supervisor logs expenses per report
  expenses: {
    labour: { type: Number, default: 0 },
    material: { type: Number, default: 0 },
    misc: { type: Number, default: 0 },
    description: { type: String, default: '' }
  },
  submittedBy: { type: String, default: '' },
  submittedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('DailyReport', DailyReportSchema);
