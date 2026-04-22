const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    category: { type: String, required: true },
    description: { type: String },
    unit: { type: String, enum: ['piece', 'box', 'kg', 'litre', 'dozen', 'carton'], default: 'piece' },
    amount: { type: Number, required: true, min: 0 },
   
    image: { type: String },
    isActive: { type: Boolean, default: true },
    
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
