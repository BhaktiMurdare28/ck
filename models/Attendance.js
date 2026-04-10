const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  project: { type: String, required: true },
  workers: [
    {
      id: { type: Number },
      name: { type: String },
      present: { type: Boolean, default: false }
    }
  ],
  submittedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
