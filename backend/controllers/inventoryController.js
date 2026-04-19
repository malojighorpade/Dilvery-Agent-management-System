const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

exports.getInventory = async (req, res) => {
  try {
    const { lowStock } = req.query;
    let query = Inventory.find().populate({ path: 'product', populate: { path: 'brand', select: 'name' } });
    const items = await query;
    
    let result = items;
    if (lowStock === 'true') {
      result = items.filter(item => item.currentStock <= item.reorderLevel);
    }
    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({ product: req.params.productId })
      .populate({ path: 'product', populate: { path: 'brand', select: 'name' } });
    if (!item) return res.status(404).json({ success: false, message: 'Inventory record not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body;
    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) return res.status(404).json({ success: false, message: 'Inventory record not found' });

    if (type === 'in') {
      inventory.currentStock += quantity;
      inventory.lastRestocked = new Date();
    } else if (type === 'out') {
      if (inventory.currentStock < quantity)
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      inventory.currentStock -= quantity;
    } else if (type === 'adjustment') {
      inventory.currentStock = quantity;
    }

    inventory.transactions.push({ type, quantity, note, performedBy: req.user._id });
    await inventory.save();
    res.json({ success: true, data: inventory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getLowStockAlerts = async (req, res) => {
  try {
    const items = await Inventory.find().populate({ path: 'product', populate: { path: 'brand', select: 'name' } });
    const lowStock = items.filter(i => i.currentStock <= i.reorderLevel && i.product?.isActive);
    res.json({ success: true, count: lowStock.length, data: lowStock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
