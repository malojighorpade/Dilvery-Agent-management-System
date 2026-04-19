const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    deliveryStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'arrived', 'delivered', 'failed', 'partial'],
      default: 'pending',
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        orderedQty: Number,
        deliveredQty: { type: Number, default: 0 },
        returnedQty: { type: Number, default: 0 },
        reason: String,
      },
    ],
    proofOfDelivery: { type: String },
    proofPublicId: { type: String },
    deliveredAt: { type: Date },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    receiverName: { type: String },
    receiverSignature: { type: String },
    notes: { type: String },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryLog', deliveryLogSchema);
