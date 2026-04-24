const DeliveryLog = require('../models/DeliveryLog');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

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
        .populate('order', 'orderNumber totalAmount')
        .populate('store', 'name address phone ownerName')
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
      .populate({ path: 'order', populate: [{ path: 'industry', select: 'name contactPerson phone address gstin' }, { path: 'items.product', select: 'name sku unit' }] })
      .populate('store', 'name ownerName phone address route gstin')
      .populate('deliveryStaff', 'name phone')
      .populate('items.product', 'name sku unit')
      .populate({ path: 'payment', populate: { path: 'store', select: 'name' } });
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
    const { status, items, receiverName, notes, latitude, longitude, paymentCollected, paymentMode } = req.body;
    const log = await DeliveryLog.findById(req.params.id).populate('order').populate('store');
    if (!log) return res.status(404).json({ success: false, message: 'Delivery log not found' });

    if (log.deliveryStaff.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (status) log.status = status;
    if (items) log.items = items;
    if (receiverName) log.receiverName = receiverName;
    if (notes) log.notes = notes;
    if (latitude && longitude) log.location = { type: 'Point', coordinates: [longitude, latitude] };
    if (paymentMode) log.paymentMode = paymentMode;

    // ─── On delivery completion ───────────────────────────────────────────────
    if (status === 'delivered' || status === 'partial') {
      log.deliveredAt = new Date();

      // 1. Deduct inventory
      const deliveryItems = items || log.items;
      for (const item of deliveryItems) {
        if (item.deliveredQty > 0) {
          await Inventory.findOneAndUpdate(
            { product: item.product || item.product?._id },
            { $inc: { currentStock: -item.deliveredQty, reservedStock: -item.orderedQty } }
          );
        }
      }

      // 2. Update linked Order status
      const allDelivered = deliveryItems.every(i => i.deliveredQty >= i.orderedQty);
      const newOrderStatus = allDelivered ? 'delivered' : 'partially_delivered';
      await Order.findByIdAndUpdate(log.order?._id || log.order, {
        status: newOrderStatus,
        ...(allDelivered ? { deliveredAt: new Date() } : {}),
      });

      // 3. Auto-generate Invoice if not already created for this delivery
      const order = log.order;
      if (order && status === 'delivered') {
        const existingInvoice = await Invoice.findOne({ order: order._id || order });
        if (!existingInvoice) {
          const orderDoc = await Order.findById(order._id || order)
            .populate('industry', 'name contactPerson phone address gstin')
            .populate('store', 'name ownerName phone address gstin')
            .populate('items.product', 'name sku');

          if (orderDoc) {
            const subtotal = orderDoc.items.reduce((s, i) => s + i.quantity * i.price, 0);
            const taxRate = 18;
            const taxAmount = Math.round(subtotal * taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            await Invoice.create({
              order: orderDoc._id,
              store: log.store?._id || log.store,
              industry: orderDoc.industry?._id || orderDoc.industry,
              items: orderDoc.items.map(i => ({
                product: i.product?._id,
                productName: i.product?.name,
                quantity: i.quantity,
                price: i.price,
                total: i.quantity * i.price,
              })),
              subtotal,
              taxRate,
              taxAmount,
              totalAmount,
              status: 'sent',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // due in 7 days
              createdBy: req.user._id,
            });
          }
        }
      }
    }

    await log.save();
    req.io?.emit('delivery:updated', { id: log._id, status: log.status });
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
exports.getByOrder = async (req, res) => {
  try {
    const log = await DeliveryLog.findOne({ order: req.params.orderId })
      .populate('store', 'name address phone')
      .populate('order', 'orderNumber totalAmount')
      .populate('deliveryStaff', 'name phone')
      .populate('items.product', 'name sku');

    res.json({
      success: true,
      data: log
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
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
      .populate({ path: 'order', select: 'orderNumber totalAmount', populate: { path: 'industry', select: 'name contactPerson phone address gstin' } })
      .populate('items.product', 'name sku unit image')
      .populate('payment')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};