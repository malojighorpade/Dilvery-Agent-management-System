const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    industry: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry' },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quantity: Number,
        price: Number,
        total: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
    dueDate: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
