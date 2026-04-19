const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, unique: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['cash', 'online', 'cheque'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
    // Cash details
    cashDenominations: {
      '2000': { type: Number, default: 0 },
      '500': { type: Number, default: 0 },
      '200': { type: Number, default: 0 },
      '100': { type: Number, default: 0 },
      '50': { type: Number, default: 0 },
      '20': { type: Number, default: 0 },
      '10': { type: Number, default: 0 },
    },
    // Online payment details
    transactionId: { type: String },
    upiId: { type: String },
    // Cheque details
    chequeNumber: { type: String },
    bankName: { type: String },
    chequeDate: { type: Date },
    // Meta
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collectedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentNumber = `PAY-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
