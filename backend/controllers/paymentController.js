const {Payment }= require('../models/Payment');
const Invoice = require('../models/Invoice');
const Store = require('../models/Store');
const DeliveryLog = require('../models/DeliveryLog');
const Order = require('../models/Order');

exports.getPayments = async (req, res) => {
  try {
    
    const { paymentMode, status, store, collectedBy, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (paymentMode) filter.paymentMode = paymentMode;
    if (status) filter.status = status;
    if (store) filter.store = store;
    if (collectedBy) filter.collectedBy = collectedBy;
    if (req.user.role === 'delivery agent') filter.collectedBy = req.user._id;
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('store', 'name ownerName')
        .populate('invoice', 'invoiceNumber')
        .populate('collectedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);
    res.json({ success: true, data: payments, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
  
};

exports.getPayment = async (req, res) => {
  try {
    
    const payment = await Payment.findById(req.params.id)
      .populate('store')
      .populate('invoice')
      .populate('collectedBy', 'name phone');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.createPayment = async (req, res) => {
  try {
    const {
      store,
      storeName, 
      amount,
      paymentMode,
      transactionId, upiId,
      chequeNumber, bankName, chequeDate, chequePhotoUrl,
      cashDenominations,
      notes,
      deliveryLogId,    // ← Pass from frontend
      orderId,          // ← Direct order link
    } = req.body;
const storeDoc = await Store.findById(store);
    // Create payment
    const payment = await Payment.create({
      store,
       storeName: storeDoc?.name || 'Store', 
      
      amount,
      paymentMode,
      transactionId: transactionId || undefined,
      upiId: upiId || undefined,
      chequeNumber: chequeNumber || undefined,
      bankName: bankName || undefined,
      chequeDate: chequeDate || undefined,
      chequePhotoUrl: chequePhotoUrl || undefined,
      cashDenominations: paymentMode === 'cash' ? cashDenominations : undefined,
      notes: notes || undefined,
      collectedBy: req.user._id,
      collectedAt: new Date(),
      status: 'completed',
    });

    let dLogId = deliveryLogId;

    if (!dLogId && orderId) {
      const existingLog = await DeliveryLog.findOne({ order: orderId });
      if (existingLog) {
        dLogId = existingLog._id;
      } else {
        const orderForLog = await Order.findById(orderId);
        if (orderForLog) {
          const newLog = await DeliveryLog.create({
            order: orderForLog._id,
            store: store,
            deliveryStaff: req.user._id,
            status: 'delivered',
            items: orderForLog.items.map(i => ({
              product: i.product,
              orderedQty: i.quantity,
              deliveredQty: i.quantity
            })),
            payment: payment._id,
            paymentCollected: true,
            paymentMode,
            deliveredAt: new Date()
          });
          dLogId = newLog._id;
        }
      }
    }

    // Link to delivery log
    if (dLogId) {
      const existingLog = await DeliveryLog.findById(dLogId);
      if (existingLog) {
        const deliveredItems = (existingLog.items || []).map((item) => ({
          ...item.toObject(),
          deliveredQty: item.orderedQty || item.deliveredQty || 0,
        }));

        await DeliveryLog.findByIdAndUpdate(dLogId, {
          payment: payment._id,
          paymentMode,
          status: 'delivered',
          deliveredAt: new Date(),
          items: deliveredItems,
        });
      }
    }

    // Get delivery log to find order
    const deliveryLog = dLogId ? await DeliveryLog.findById(dLogId).populate('order') : null;
    const order = deliveryLog?.order || (orderId ? await Order.findById(orderId) : null);

    // Auto-generate invoice
    if (order) {
      let invoice = await Invoice.findOne({ order: order._id });
      
      const orderDoc = await Order.findById(order._id)
        .populate('industry', 'name contactPerson phone address gstin')
        .populate('store', 'name ownerName phone address gstin')
        .populate('items.product', 'name sku');

      if (!invoice && orderDoc) {
        const subtotal = orderDoc.items.reduce((s, i) => s + i.quantity * i.price, 0);
        const taxRate = 18;
        const taxAmount = Math.round(subtotal * taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        invoice = await Invoice.create({
          invoiceNumber: `INV-${Date.now()}`,
          order: orderDoc._id,
          store: orderDoc.store?._id,
          industry: orderDoc.industry?._id,
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
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: req.user._id,
        });
      }

      if (invoice) {
        payment.invoice = invoice._id;
        await payment.save();
      }

      if (orderDoc) {
        if (deliveryLog) {
          orderDoc.items.forEach(orderItem => {
            const dItem = deliveryLog.items.find(
              (i) => i.product.toString() === (orderItem.product._id ? orderItem.product._id.toString() : orderItem.product.toString())
            );
            if (dItem) {
              orderItem.deliveredQuantity = dItem.deliveredQty;
            }
          });
        } else {
          // If no delivery log (fallback), assume full delivery
          orderDoc.items.forEach(orderItem => {
            orderItem.deliveredQuantity = orderItem.quantity;
          });
        }
        orderDoc.status = 'completed';
        await orderDoc.save();
      }
    }

    // Emit real-time event
    req.io?.emit('payment:collected', {
      paymentId: payment._id,
      store: payment.store,
      amount,
      paymentMode,
      collectedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getPaymentSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    if (req.user.role === 'delivery agent') match.collectedBy = req.user._id;

    const summary = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMode',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalCollected = summary.reduce((s, i) => s + i.total, 0);
    res.json({ success: true, data: { summary, totalCollected } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};