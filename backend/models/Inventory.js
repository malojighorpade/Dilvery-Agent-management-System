const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    currentStock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10 },
    warehouse: { type: String, default: 'Main Warehouse' },
    lastRestocked: { type: Date },
    transactions: [
      {
        type: { type: String, enum: ['in', 'out', 'adjustment'], required: true },
        quantity: { type: Number, required: true },
        reference: { type: String },
        note: { type: String },
        date: { type: Date, default: Date.now },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

inventorySchema.virtual('availableStock').get(function () {
  return this.currentStock - this.reservedStock;
});

module.exports = mongoose.model('Inventory', inventorySchema);
