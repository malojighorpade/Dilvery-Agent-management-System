const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  deliveredQuantity: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    industry: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },

    // ─── ADDED: delivery destination store ────────────────────────────────────
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },

    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'dispatched', 'partially_delivered', 'delivered', 'cancelled'],
      default: 'pending',
    },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryDate: { type: Date },
    deliveredAt: { type: Date },
    notes: { type: String },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);