const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    route: { type: String },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gstin: { type: String },
    creditLimit: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Store', storeSchema);
