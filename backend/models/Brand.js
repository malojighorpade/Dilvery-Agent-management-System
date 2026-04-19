const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    logo: { type: String },
    contactPerson: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Brand', brandSchema);
