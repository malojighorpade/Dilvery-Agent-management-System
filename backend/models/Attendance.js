const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checkIn: {
      time: { type: Date },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      address: { type: String },
    },
    checkOut: {
      time: { type: Date },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      address: { type: String },
    },
    status: { type: String, enum: ['present', 'absent', 'half-day', 'leave'], default: 'present' },
    hoursWorked: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
