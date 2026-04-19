const DeliveryLog = require('../models/DeliveryLog');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

exports.getDeliveryLogs = async (req, res) => {
  try {
    const { status, deliveryStaff, order, store, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (deliveryStaff) filter.deliveryStaff = deliveryStaff;
    if (order) filter.order = order;
    if (store) filter.store = store;
    if (req.user.role === 'staff') filter.deliveryStaff = req.user._id;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      DeliveryLog.find(filter)
        .populate('order', 'orderNumber')
        .populate('store', 'name address phone')
        .populate('deliveryStaff', 'name phone')
        .populate('items.product', 'name sku unit')
        .populate('payment')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      DeliveryLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDeliveryLog = async (req, res) => {
  try {
    const log = await DeliveryLog.findById(req.params.id)
      .populate('order')
      .populate('store')
      .populate('deliveryStaff', 'name phone')
      .populate('items.product')
      .populate('payment');
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDeliveryLog = async (req, res) => {
  try {
    const log = await DeliveryLog.create({ ...req.body, deliveryStaff: req.user._id });
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, items, receiverName, notes, latitude, longitude } = req.body;
    const log = await DeliveryLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });

    if (log.deliveryStaff.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    log.status = status;
    if (items) log.items = items;
    if (receiverName) log.receiverName = receiverName;
    if (notes) log.notes = notes;
    if (latitude && longitude) log.location = { type: 'Point', coordinates: [longitude, latitude] };

    if (status === 'delivered' || status === 'partial') {
      log.deliveredAt = new Date();
      // Deduct from inventory
      for (const item of log.items) {
        if (item.deliveredQty > 0) {
          await Inventory.findOneAndUpdate(
            { product: item.product },
            { $inc: { currentStock: -item.deliveredQty, reservedStock: -item.orderedQty } }
          );
        }
      }
      // Update order status
      const allDelivered = log.items.every(i => i.deliveredQty >= i.orderedQty);
      await Order.findByIdAndUpdate(log.order, {
        status: allDelivered ? 'delivered' : 'partially_delivered',
        ...(allDelivered ? { deliveredAt: new Date() } : {}),
      });
    }

    await log.save();
    req.io?.emit('delivery:updated', log);
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.uploadProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const log = await DeliveryLog.findByIdAndUpdate(
      req.params.id,
      { proofOfDelivery: req.file.path, proofPublicId: req.file.filename },
      { new: true }
    );
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });
    res.json({ success: true, data: log, imageUrl: req.file.path });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyDeliveries = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = { deliveryStaff: req.user._id };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.createdAt = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    const logs = await DeliveryLog.find(filter)
      .populate('store', 'name address phone ownerName')
      .populate('order', 'orderNumber totalAmount')
      .populate('items.product', 'name sku unit image')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
