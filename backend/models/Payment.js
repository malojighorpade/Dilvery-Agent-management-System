// ✅ UPDATED backend/models/Payment.js - WITH ORDER & DELIVERY TRACKING

const mongoose = require('mongoose');

//
// 🔹 MAIN PAYMENT (COMMON TABLE) - UPDATED
//
const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, unique: true },

    // ─── LINKED RECORDS ──────────────────────────────────────────────────
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // ✅ NEW
    deliveryLog: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryLog' }, // ✅ NEW

    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    storeName: { type: String, required: true, trim: true },

    // ─── PAYMENT DETAILS ─────────────────────────────────────────────────
    amount: { type: Number, required: true },

    paymentMode: {
      type: String,
      enum: ['cash', 'online', 'cheque'],
      required: true,
      lowercase: true
    },

    // ─── PAYMENT TYPE (NEW) ──────────────────────────────────────────────
    paymentType: {
      type: String,
      enum: ['full', 'partial', 'installment'],
      default: 'full'
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    collectedAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },

    notes: String,

    // ─── ONLINE PAYMENT DATA ────────────────────────────────────────────
    transactionId: String,
    upiId: String,

    // ─── CHEQUE PAYMENT DATA ────────────────────────────────────────────
    chequeNumber: String,
    bankName: String,
    chequeDate: Date,
    chequeImage: String,

    // ─── CASH PAYMENT DATA ──────────────────────────────────────────────
    cashDenominations: {
      '2000': { type: Number, default: 0 },
      '500': { type: Number, default: 0 },
      '200': { type: Number, default: 0 },
      '100': { type: Number, default: 0 },
      '50': { type: Number, default: 0 },
      '20': { type: Number, default: 0 },
      '10': { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

//
// 🔹 ONLINE PAYMENT (ONLY EXTRA DATA)
//
const onlinePaymentSchema = new mongoose.Schema({
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  orderId: { type: String, required: true },
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

//
// 🔹 CASH PAYMENT
//
const cashPaymentSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },

    amount: { type: Number, required: true },

    denominations: {
      '2000': { type: Number, default: 0 },
      '500': { type: Number, default: 0 },
      '200': { type: Number, default: 0 },
      '100': { type: Number, default: 0 },
      '50': { type: Number, default: 0 },
      '20': { type: Number, default: 0 },
      '10': { type: Number, default: 0 },
    }
  },
  { timestamps: true }
);

//
// 🔥 AUTO COPY AMOUNT FROM PAYMENT
//
cashPaymentSchema.pre('save', async function (next) {
  try {
    const payment = await mongoose.model('Payment').findById(this.payment);

    if (!payment) return next(new Error('Payment not found'));

    this.amount = payment.amount;

    next();
  } catch (err) {
    next(err);
  }
});

//
// 🔥 CASH VALIDATION
//
cashPaymentSchema.pre('validate', function (next) {
  const total = Object.entries(this.denominations || {}).reduce(
    (sum, [note, count]) => sum + parseInt(note) * (count || 0),
    0
  );

  if (total !== this.amount) {
    return next(
      new Error(`Cash mismatch: expected ₹${this.amount}, got ₹${total}`)
    );
  }

  next();
});

//
// 🔥 CASH TABLE METHOD
//
cashPaymentSchema.methods.toCashTable = function () {
  return {
    orderId: this.payment,
    dateTime: new Date(this.createdAt).toLocaleString(),
    amount: this.amount
  };
};

//
// 🔥 CASH BREAKDOWN
//
cashPaymentSchema.methods.toCashBreakdown = function () {
  return Object.entries(this.denominations || {})
    .filter(([_, count]) => count > 0)
    .map(([note, count]) => ({
      denomination: note,
      count,
      total: parseInt(note) * count
    }));
};

//
// 🔹 CHEQUE PAYMENT
//
const chequePaymentSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },

    chequeNumber: { type: String, required: true },
    chequeDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    chequeImage: { type: String, required: true }
  },
  { timestamps: true }
);

//
// 🔥 CHEQUE TABLE METHOD
//
chequePaymentSchema.methods.toChequeTable = function () {
  return {
    orderId: this.payment,
    dateTime: new Date(this.createdAt).toLocaleString(),
    chequeNumber: this.chequeNumber,
    amount: this.amount,
    chequeImage: this.chequeImage,
  };
};

//
// 🔹 AUTO PAYMENT NUMBER
//
paymentSchema.pre('save', async function (next) {
  if (!this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentNumber = `PAY-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

//
// 🔹 MODELS
//
const Payment = mongoose.model('Payment', paymentSchema);
const OnlinePayment = mongoose.model('OnlinePayment', onlinePaymentSchema);
const CashPayment = mongoose.model('CashPayment', cashPaymentSchema);
const ChequePayment = mongoose.model('ChequePayment', chequePaymentSchema);

module.exports = {
  Payment,
  OnlinePayment,
  CashPayment,
  ChequePayment
};