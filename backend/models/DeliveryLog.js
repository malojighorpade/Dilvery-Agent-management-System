// ✅ UPDATED backend/models/DeliveryLog.js - WITH PAYMENT STATUS

const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    deliveryStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // ─── DELIVERY STATUS ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending',
        'in_transit',
        'arrived',
        'delivered',        // ✅ All items delivered
        'partial_delivery', // ⚠️ Some items not delivered (returned/not given)
        'delivery_cancelled', // ❌ CANCELLED - NO PAYMENT COLLECTED
        'failed',
        'completed'
      ],
      default: 'pending',
    },
    
    // ─── ITEMS WITH TRACKING ─────────────────────────────────────────────
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        orderedQty: Number,
        deliveredQty: { type: Number, default: 0 },
        returnedQty: { type: Number, default: 0 },
        reason: String, // "damaged", "refused", "out_of_stock", etc.
      },
    ],
    
    // ─── DELIVERY PROOF ───────────────────────────────────────────────────
    proofOfDelivery: { type: String },
    proofPublicId: { type: String },
    deliveredAt: { type: Date },
    
    // ─── LOCATION ─────────────────────────────────────────────────────────
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    
    // ─── RECEIVER INFO ────────────────────────────────────────────────────
    receiverName: { type: String },
    receiverSignature: { type: String },
    notes: { type: String },
    
    // ─── PAYMENT STATUS (AFTER DELIVERY) ──────────────────────────────────
    paymentStatus: {
      type: String,
      enum: [
        'not_collected',      // ⏳ Delivery complete but payment not yet taken
        'partial_collected',  // 💵 Some amount collected
        'full_collected',     // ✅ Full amount collected
        'cancelled'           // ❌ Delivery cancelled - NO PAYMENT
      ],
      default: 'not_collected',
    },
    
    // ─── PAYMENT TRACKING ─────────────────────────────────────────────────
    paymentHistory: [
      {
        amount: Number,
        mode: { type: String, enum: ['cash', 'online', 'upi', 'cheque'] },
        collectedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    
    totalPaymentCollected: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    
    // ─── CANCELLATION REASON (IF DELIVERY CANCELLED) ──────────────────────
    cancellationReason: String, // "store_refused", "delivery_failed", etc.
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // ─── PAYMENT REFERENCE ───────────────────────────────────────────────
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryLog', deliveryLogSchema);


// ✅ UPDATED backend/models/Order.js - WITH PAYMENT STATUS

