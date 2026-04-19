const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    gstin: { type: String, trim: true },
    contactPerson: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    brands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }],
    creditLimit: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Industry', industrySchema);
