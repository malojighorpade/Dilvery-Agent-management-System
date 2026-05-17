const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  deliveredQuantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    industry: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    
    // ─── ORDER TYPE & PDF TRACKING ───────────────────────────────────────
    orderType: { 
      type: String, 
      enum: ['manual', 'pdf'], 
      default: 'manual'
    },
    
    pdfInvoice: {
      fileName: String,
      pdfUrl: String,
      uploadedAt: Date,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    
    // ─── DELIVERY STATUS ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'dispatched',
        'partially_delivered',
        'delivered',
        'completed', // ✅ Delivered & Fully Paid
        'cancelled'  // ❌ No payment collected
      ],
      default: 'pending',
    },
    
    // ─── PAYMENT STATUS (NEW) ────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: [
        'pending',            // 🕐 Not yet collected
        'partial_collected',  // 💵 Some amount collected
        'full_collected',     // ✅ Full amount collected
        'cancelled'           // ❌ Delivery cancelled
      ],
      default: 'pending',
    },
    
    // ─── PAYMENT TRACKING (NEW) ──────────────────────────────────────────
    amountCollected: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryDate: { type: Date },
    deliveredAt: { type: Date },
    notes: { type: String },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);