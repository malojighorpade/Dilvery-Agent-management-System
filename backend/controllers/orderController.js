// backend/controllers/orderController.js - FIXED LOGGING VERSION

const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

// ✅ SIMPLIFIED createOrder with PROPER logging
exports.createOrder = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📌 CREATE ORDER REQUEST');
    console.log('========================================');
    console.log('Order Type:', req.body.orderType);
    console.log('Industry:', req.body.industry);
    console.log('Store:', req.body.store);
    console.log('Total Amount:', req.body.totalAmount);
    console.log('File Uploaded:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('  - Filename:', req.file.originalname);
      console.log('  - Size:', req.file.size, 'bytes');
      console.log('  - URL:', req.file.path);
    }
    console.log('Items:', req.body.items ? 'YES' : 'NO');
    console.log('User ID:', req.user?._id);
    console.log('========================================\n');

    const { industry, store, priority, notes, deliveryDate, orderType, totalAmount, items } = req.body;

    // ─── VALIDATION ───────────────────────────────────────────────────
    if (!industry) {
      console.log('❌ Error: Industry is required');
      return res.status(400).json({ success: false, message: 'Industry is required' });
    }

    if (!orderType || !['manual', 'pdf'].includes(orderType)) {
      console.log('❌ Error: Invalid orderType:', orderType);
      return res.status(400).json({ success: false, message: 'Order type must be manual or pdf' });
    }

    let orderData = {
      industry,
     store: store && store !== '' ? store : null,
      priority: priority || 'normal',
      notes: notes || '',
      deliveryDate: deliveryDate || null,
      orderType,
      createdBy: req.user._id,
    };

    // ─── HANDLE PDF ORDERS ────────────────────────────────────────────
    if (orderType === 'pdf') {
      console.log('📄 Creating PDF order...');
      
      if (!req.file) {
        console.log('❌ Error: No PDF file uploaded');
        return res.status(400).json({ success: false, message: 'PDF file is required for PDF orders' });
      }

      const amount = Number(totalAmount);
      if (!amount || amount <= 0) {
        console.log('❌ Error: Invalid total amount:', totalAmount);
        return res.status(400).json({ success: false, message: 'Total amount is required and must be greater than 0' });
      }

      orderData.items = [];
      orderData.totalAmount = amount;
      orderData.pdfInvoice = {
        fileName: req.file.originalname,
        pdfUrl: req.file.path,
        uploadedAt: new Date(),
        uploadedBy: req.user._id,
      };

      console.log('✅ PDF data prepared:');
      console.log('   - File:', req.file.originalname);
      console.log('   - URL:', req.file.path);
      console.log('   - Amount:', amount);
    }
    // ─── HANDLE MANUAL ORDERS ─────────────────────────────────────────
    else {
      console.log('📝 Creating manual order...');
      
      // Parse items if it's a string (from FormData)
      let parsedItems = items;
      if (typeof items === 'string') {
        console.log('   - Parsing items from string...');
        parsedItems = JSON.parse(items);
      }

      if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
        console.log('❌ Error: No items provided');
        return res.status(400).json({ success: false, message: 'Items are required for manual orders' });
      }

      orderData.items = parsedItems;
      orderData.totalAmount = parsedItems.reduce((sum, item) => {
        return sum + (Number(item.quantity) * Number(item.price));
      }, 0);

      console.log('✅ Manual data prepared:');
      console.log('   - Items count:', parsedItems.length);
      console.log('   - Total calculated:', orderData.totalAmount);

 
      console.log('   - Reserving stock...');
      for (const item of parsedItems) {
        await Inventory.findOneAndUpdate(
          { product: item.product },
          { $inc: { reservedStock: item.quantity } },
          { upsert: true }
        );
      }
      console.log('   - Stock reserved ✅');
    }

    // ─── CREATE ORDER ────────────────────────────────────────────────────
    console.log('💾 Saving order to database...');
    const order = await Order.create(orderData);
    console.log('✅ Order created with ID:', order._id);
    console.log('   - Order Number:', order.orderNumber);

    // Populate data
    console.log('📎 Populating related data...');
    const populated = await order.populate([
      { path: 'industry', select: 'name' },
      { path: 'store', select: 'name' },
      { path: 'items.product', select: 'name sku' },
      { path: 'createdBy', select: 'name' },
    ]);
    console.log('✅ Data populated');

    // Socket.io emit
    if (req.io) {
      req.io.emit('order:created', populated);
      console.log('📡 Socket.io event emitted');
    }

    console.log('✅ ORDER CREATED SUCCESSFULLY\n');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('\n❌ ERROR IN createOrder:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('\n');
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────

exports.getOrders = async (req, res) => {
  try {
    const { status, assignedStaff, industry, priority, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assignedStaff) filter.assignedStaff = assignedStaff;
    if (industry) filter.industry = industry;
    if (priority) filter.priority = priority;
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };

    if (req.user.role === 'delivery agent') filter.assignedStaff = req.user._id;

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
    console.error('Error in getOrders:', err.message);
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
    console.error('Error in getOrder:', err.message);
    res.status(500).json({ success: false, message: err.message });
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
    console.error('Error in updateOrder:', err.message);
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
    console.error('Error in assignStaff:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {
      assignedStaff: req.user._id,
      paymentStatus: { $nin: ['partial_collected', 'full_collected', 'cancelled'] },
    };
    if (status) filter.status = status;
    else filter.status = { $in: ['processing', 'dispatched', 'partially_delivered'] };

    const orders = await Order.find(filter)
      .populate('industry', 'name contactPerson phone email address gstin')
      .populate('store', 'name ownerName phone address route gstin')
      .populate('assignedStaff', 'name phone')
      .populate('items.product', 'name sku unit image')
      .sort({ deliveryDate: 1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('Error in getMyOrders:', err.message);
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
    console.error('Error in deleteOrder:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const pdfUrl = req.file.path;
    const pdfFileName = req.file.originalname;

    res.json({
      success: true,
      pdfUrl,
      pdfFileName,
    });
  } catch (err) {
    console.error('Error in uploadPDF:', err.message);
    res.status(500).json({ success: false, message: 'Failed to upload PDF: ' + err.message });
  }
};