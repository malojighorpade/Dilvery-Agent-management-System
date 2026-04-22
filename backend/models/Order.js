const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  deliveredQuantity: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: () =>
        "ORD-" +
        Date.now() +
        "-" +
        Math.floor(Math.random() * 1000),
    },

    industry: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },

    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },

    items: [orderItemSchema],

    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'dispatched',
        'partially_delivered',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },

    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    deliveryDate: { type: Date },

    deliveredAt: { type: Date },

    notes: { type: String },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// ✅ THIS WAS MISSING
module.exports = mongoose.model('Order', orderSchema);