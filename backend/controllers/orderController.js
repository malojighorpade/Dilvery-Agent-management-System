const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const DeliveryLog = require('../models/DeliveryLog');

exports.getOrders = async (req, res) => {
  try {
    const { status, assignedStaff, industry, priority, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assignedStaff) filter.assignedStaff = assignedStaff;
    if (industry) filter.industry = industry;
    if (priority) filter.priority = priority;
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };

    if (req.user.role === 'staff') filter.assignedStaff = req.user._id;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('industry', 'name')
        .populate('store', 'name')
        .populate('assignedStaff', 'name phone')
        .populate('items.product', 'name sku unit')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, count: orders.length, total, pages: Math.ceil(total / limit), data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('industry')
      .populate('store')
      .populate('assignedStaff', 'name phone email')
      .populate('items.product')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    delete orderData.orderNumber;

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const order = await Order.create({
      ...orderData,
      items,
      totalAmount,
      createdBy: req.user._id,
    });

    for (const item of items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { reservedStock: item.quantity } }
      );
    }

    const populated = await order.populate([
      { path: 'industry', select: 'name' },
      { path: 'store', select: 'name' },
      { path: 'items.product', select: 'name sku' },
    ]);

    req.io?.emit('order:created', populated);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('industry', 'name')
      .populate('store', 'name')
      .populate('assignedStaff', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    req.io?.emit('order:updated', order);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.assignStaff = async (req, res) => {
  try {
    const { staffId, deliveryDate } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedStaff: staffId, deliveryDate, status: 'processing' },
      { new: true }
    ).populate('assignedStaff', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    req.io?.emit('order:assigned', order);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── KEY FIX: populate store with full address ────────────────────────────────
exports.getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { assignedStaff: req.user._id };
    if (status) filter.status = status;
    else filter.status = { $in: ['processing', 'dispatched', 'partially_delivered'] };

    const orders = await Order.find(filter)
      .populate('industry', 'name contactPerson phone email address gstin')
      .populate('store', 'name ownerName phone address route gstin')   // ← FULL store data
      .populate('assignedStaff', 'name phone')
      .populate('items.product', 'name sku unit image')
      .sort({ deliveryDate: 1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Only pending orders can be deleted' });
    await order.deleteOne();
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};