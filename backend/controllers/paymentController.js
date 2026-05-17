

// ✅ UPDATED backend/controllers/paymentController.js - INTEGRATED WITH EXISTING

const { Payment } = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Store = require('../models/Store');
const DeliveryLog = require('../models/DeliveryLog');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

const normalizeHistoryMode = (mode) => {
  if (!mode) return 'cash';
  const m = String(mode).toLowerCase();
  if (m === 'upi') return 'online';
  return m;
};

const mapOrderPaymentStatus = (deliveryPaymentStatus) => {
  if (deliveryPaymentStatus === 'not_collected') return 'pending';
  return deliveryPaymentStatus;
};

/** Build delivery log line items (PDF orders have no product lines) */
const buildDeliveryLogItems = (orderDoc) => {
  if (orderDoc.items?.length > 0) {
    return orderDoc.items.map((i) => ({
      product: i.product,
      orderedQty: i.quantity,
      deliveredQty: i.quantity,
    }));
  }
  if (orderDoc.orderType === 'pdf') {
    return [{ orderedQty: 1, deliveredQty: 1, reason: 'PDF invoice order' }];
  }
  return [];
};

/** Find delivery log by ID or order ID (handles order ID sent by mistake from frontend) */
const resolveDeliveryLog = async (deliveryLogId, orderId) => {
  if (deliveryLogId) {
    const byId = await DeliveryLog.findById(deliveryLogId);
    if (byId) return byId;
    const byOrderFromId = await DeliveryLog.findOne({ order: deliveryLogId });
    if (byOrderFromId) return byOrderFromId;
  }
  if (orderId) {
    return DeliveryLog.findOne({ order: orderId });
  }
  return null;
};

/** Apply a collection to delivery log + order; returns { paymentStatus, newCollected, outstanding } */
const applyCollectionToDelivery = async ({
  deliveryLog,
  order,
  amount,
  paymentMode,
  paymentId,
  notes,
  transactionId,
}) => {
  const orderTotal = Number(order?.totalAmount) || 0;
  const currentCollected = Number(deliveryLog.totalPaymentCollected) || 0;
  const outstandingBefore = Math.max(0, orderTotal - currentCollected);
  const collectAmount = Math.min(Number(amount), outstandingBefore);

  if (collectAmount <= 0) {
    throw new Error('Nothing outstanding to collect');
  }

  const newCollected = currentCollected + collectAmount;
  let paymentStatus = 'not_collected';
  if (newCollected >= orderTotal) {
    paymentStatus = 'full_collected';
  } else if (newCollected > 0) {
    paymentStatus = 'partial_collected';
  }

  const historyMode = normalizeHistoryMode(paymentMode);
  if (!deliveryLog.paymentHistory) deliveryLog.paymentHistory = [];
  deliveryLog.paymentHistory.push({
    amount: collectAmount,
    mode: historyMode,
    collectedAt: new Date(),
    notes: notes || '',
  });

  deliveryLog.payment = paymentId;
  deliveryLog.paymentStatus = paymentStatus;
  deliveryLog.totalPaymentCollected = newCollected;
  deliveryLog.outstandingAmount = Math.max(0, orderTotal - newCollected);

  const orderPaymentStatus = mapOrderPaymentStatus(paymentStatus);
  order.paymentStatus = orderPaymentStatus;
  order.amountCollected = newCollected;
  order.outstandingAmount = Math.max(0, orderTotal - newCollected);

  if (newCollected > 0) {
    if (['pending', 'processing', 'dispatched'].includes(order.status)) {
      order.status = 'delivered';
    }
    if (['pending', 'in_transit', 'arrived'].includes(deliveryLog.status)) {
      deliveryLog.status = 'delivered';
      if (!deliveryLog.deliveredAt) deliveryLog.deliveredAt = new Date();
    }
  }

  if (paymentStatus === 'full_collected') {
    order.status = 'completed';
    if (deliveryLog.status === 'delivered') deliveryLog.status = 'completed';
  }

  await deliveryLog.save();
  await order.save();

  return {
    paymentStatus,
    newCollected,
    outstanding: deliveryLog.outstandingAmount,
    collectAmount,
    orderPaymentStatus,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING getPayments, getPayment, getPaymentSummary - UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

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
        .populate('order', 'orderNumber')
        .populate('deliveryLog', '_id')
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
      .populate('order')
      .populate('deliveryLog')
      .populate('collectedBy', 'name phone');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ UPDATED createPayment - WITH PAYMENT STATUS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

// ✅ SAFE VERSION - paymentController.js createPayment function
// Replace the entire function starting at line 67

exports.createPayment = async (req, res) => {
  try {
    console.log('📥 createPayment called');
    console.log('req.body:', req.body);
    console.log('Content-Type:', req.get('Content-Type'));

    // ✅ SAFETY CHECK - Ensure req.body exists and is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('❌ ERROR: req.body is empty or undefined!');
      return res.status(400).json({ 
        success: false, 
        message: 'Request body is empty. Make sure you are sending JSON data with Content-Type: application/json' 
      });
    }

    const {
      store,
      storeName,
      amount,
      paymentMode,
      transactionId,
      upiId,
      chequeNumber,
      bankName,
      chequeDate,
      chequeImage,
      cashDenominations,
      notes,
      deliveryLogId,
      orderId,
    } = req.body;

    const requestedAmount = Number(amount);

    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    if (!paymentMode) {
      return res.status(400).json({
        success: false,
        message: 'Payment mode is required',
      });
    }

    let storeId = store;
    let finalStoreName = storeName;

    // ✅ If no store provided, try to get it from order or delivery
    if (!storeId) {
      if (orderId) {
        const orderDoc = await Order.findById(orderId).populate('store');
        if (orderDoc && orderDoc.store) {
          storeId = orderDoc.store._id;
          finalStoreName = orderDoc.store.name;
        }
      } else if (deliveryLogId) {
        const deliveryDoc = await DeliveryLog.findById(deliveryLogId).populate('store');
        if (deliveryDoc && deliveryDoc.store) {
          storeId = deliveryDoc.store._id;
          finalStoreName = deliveryDoc.store.name;
        }
      }
    }

    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Store information is required (provide store ID or orderId/deliveryLogId with store)' 
      });
    }

    // ✅ Get store details
    const storeDoc = await Store.findById(storeId);
    if (!finalStoreName && storeDoc) {
      finalStoreName = storeDoc.name;
    }
    if (!finalStoreName) {
      finalStoreName = 'Unknown Store';
    }

    // Resolve order total for partial vs full (cap amount at outstanding)
    let orderTotalForCap = 0;
    let existingCollected = 0;
    if (deliveryLogId) {
      const dl = await DeliveryLog.findById(deliveryLogId);
      if (dl) {
        existingCollected = dl.totalPaymentCollected || 0;
        const ord = await Order.findById(dl.order);
        orderTotalForCap = ord?.totalAmount || 0;
      }
    } else if (orderId) {
      const ord = await Order.findById(orderId);
      orderTotalForCap = ord?.totalAmount || 0;
      const dl = await DeliveryLog.findOne({ order: orderId });
      if (dl) existingCollected = dl.totalPaymentCollected || 0;
    }

    const outstanding = Math.max(0, orderTotalForCap - existingCollected);
    const collectAmount =
      orderTotalForCap > 0 ? Math.min(requestedAmount, outstanding || requestedAmount) : requestedAmount;

    if (collectAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order is already fully paid',
      });
    }

    const resolvedPaymentType =
      orderTotalForCap > 0 && collectAmount + existingCollected >= orderTotalForCap ? 'full' : 'partial';

    console.log('✅ Creating payment with store:', storeId, 'amount:', collectAmount);

    // ─── CREATE PAYMENT ──────────────────────────────────────────────────
    const payment = await Payment.create({
      store: storeId,
      storeName: finalStoreName,
      amount: collectAmount,
      paymentMode,
      paymentType: resolvedPaymentType,
      transactionId: transactionId || undefined,
      upiId: upiId || undefined,
      chequeNumber: chequeNumber || undefined,
      bankName: bankName || undefined,
      chequeDate: chequeDate || undefined,
      chequeImage: chequeImage || undefined,
      cashDenominations: paymentMode === 'cash' ? cashDenominations : undefined,
      notes: notes || undefined,
      collectedBy: req.user._id,
      collectedAt: new Date(),
      status: 'completed',
      order: orderId || undefined,
      deliveryLog: deliveryLogId || undefined,
    });

    console.log('✅ Payment created:', payment._id);

    let dLogId = deliveryLogId;

    // ─── FIND OR CREATE DELIVERY LOG ─────────────────────────────────────
    if (!dLogId && orderId) {
      const existingLog = await DeliveryLog.findOne({ order: orderId });
      if (existingLog) {
        dLogId = existingLog._id;
      } else {
        const orderForLog = await Order.findById(orderId);
        if (orderForLog) {
          const newLog = await DeliveryLog.create({
            order: orderForLog._id,
            store: storeId,
            deliveryStaff: req.user._id,
            status: 'delivered',
            items: buildDeliveryLogItems(orderForLog),
            payment: payment._id,
            deliveredAt: new Date()
          });
          dLogId = newLog._id;
          console.log('✅ DeliveryLog created:', dLogId);
        }
      }
    }

    // ─── UPDATE DELIVERY LOG WITH PAYMENT STATUS ────────────────────────
    if (dLogId) {
      const existingLog = await DeliveryLog.findById(dLogId);
      if (existingLog) {
        const deliveredItems = (existingLog.items || []).map((item) => ({
          ...item.toObject(),
          deliveredQty: item.orderedQty || item.deliveredQty || 0,
        }));

        existingLog.items = deliveredItems;
        if (existingLog.status !== 'delivered' && existingLog.status !== 'completed') {
          existingLog.status = 'delivered';
          existingLog.deliveredAt = new Date();
        }

        const orderForPayment = await Order.findById(existingLog.order);
        if (orderForPayment) {
          const result = await applyCollectionToDelivery({
            deliveryLog: existingLog,
            order: orderForPayment,
            amount: collectAmount,
            paymentMode,
            paymentId: payment._id,
            notes,
            transactionId,
          });
          console.log('✅ DeliveryLog & Order updated with payment status:', result.paymentStatus);
        }
      }
    } else if (orderId) {
      const orderForPayment = await Order.findById(orderId);
      const existingLog = await DeliveryLog.findOne({ order: orderId });
      if (orderForPayment && existingLog) {
        await applyCollectionToDelivery({
          deliveryLog: existingLog,
          order: orderForPayment,
          amount: collectAmount,
          paymentMode,
          paymentId: payment._id,
          notes,
          transactionId,
        });
      } else if (orderForPayment) {
        const orderTotal = orderForPayment.totalAmount || 0;
        const newCollected = collectAmount;
        const paymentStatus =
          newCollected >= orderTotal ? 'full_collected' : 'partial_collected';
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: mapOrderPaymentStatus(paymentStatus),
          amountCollected: newCollected,
          outstandingAmount: Math.max(0, orderTotal - newCollected),
          ...(paymentStatus === 'full_collected' ? { status: 'completed' } : {}),
        });
      }
    }

    // ─── GET DELIVERY LOG TO FIND ORDER ──────────────────────────────────
    const deliveryLog = dLogId ? await DeliveryLog.findById(dLogId).populate('order') : null;
    const order = deliveryLog?.order || (orderId ? await Order.findById(orderId) : null);

    // ─── AUTO-GENERATE INVOICE (if not exists) ──────────────────────────
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

        console.log('✅ Invoice created:', invoice._id);
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
          orderDoc.items.forEach(orderItem => {
            orderItem.deliveredQuantity = orderItem.quantity;
          });
        }
        
        const freshOrder = await Order.findById(order._id);
        if (freshOrder?.paymentStatus === 'full_collected') {
          orderDoc.status = 'completed';
          orderDoc.paymentStatus = 'full_collected';
          orderDoc.amountCollected = freshOrder.amountCollected;
          orderDoc.outstandingAmount = freshOrder.outstandingAmount;
        }
        await orderDoc.save();
      }
    }

    // ─── EMIT SOCKET EVENTS ─────────────────────────────────────────────
    req.io?.emit('payment:collected', {
      paymentId: payment._id,
      store: payment.store,
      amount: collectAmount,
      paymentMode,
      collectedBy: req.user._id,
    });

    console.log('✅ Payment creation successful!');
    res.status(201).json({
      success: true,
      data: payment,
      collectedAmount: collectAmount,
      paymentType: resolvedPaymentType,
    });
  } catch (err) {
    console.error('❌ Payment creation error:', err.message);
    console.error('Stack:', err.stack);
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

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW FUNCTIONS - PAYMENT STATUS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// Collect Partial Payment (additional collection on existing delivery)
exports.collectPartialPayment = async (req, res) => {
  try {
    const { deliveryLogId, orderId, amount, mode, notes, transactionId } = req.body;

    if (!deliveryLogId && !orderId) {
      return res.status(400).json({ success: false, message: 'Delivery log or order ID is required' });
    }

    const requestedAmount = Number(amount);
    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    if (!mode) {
      return res.status(400).json({ success: false, message: 'Payment mode is required' });
    }

    const delivery = await resolveDeliveryLog(deliveryLogId, orderId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found for this order' });
    }

    const order = await Order.findById(delivery.order);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const storeDoc = await Store.findById(delivery.store);
    const outstanding = Math.max(0, (order.totalAmount || 0) - (delivery.totalPaymentCollected || 0));

    if (outstanding <= 0) {
      return res.status(400).json({ success: false, message: 'Order is already fully paid' });
    }

    if (requestedAmount > outstanding) {
      return res.status(400).json({
        success: false,
        message: `Cannot collect more than outstanding ₹${outstanding}`,
      });
    }

    const paymentMode = String(mode).toLowerCase() === 'upi' ? 'online' : String(mode).toLowerCase();
    if (paymentMode === 'online' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID required for online payment' });
    }

    const payment = await Payment.create({
      store: delivery.store,
      storeName: storeDoc?.name || 'Store',
      amount: requestedAmount,
      paymentMode,
      paymentType: requestedAmount >= outstanding ? 'full' : 'partial',
      transactionId: transactionId || undefined,
      collectedBy: req.user._id,
      collectedAt: new Date(),
      status: 'completed',
      notes: notes || '',
      order: order._id,
      deliveryLog: delivery._id,
    });

    const result = await applyCollectionToDelivery({
      deliveryLog: delivery,
      order,
      amount: requestedAmount,
      paymentMode,
      paymentId: payment._id,
      notes,
      transactionId,
    });

    req.io?.emit('payment:collected', {
      deliveryLogId: delivery._id,
      orderId: order._id,
      amount: result.collectAmount,
      status: result.paymentStatus,
    });

    res.json({
      success: true,
      message:
        result.paymentStatus === 'full_collected'
          ? 'Full payment collected!'
          : 'Partial payment recorded',
      data: {
        payment,
        deliveryLogId: delivery._id,
        paymentStatus: result.paymentStatus,
        totalCollected: result.newCollected,
        collectedAmount: result.collectAmount,
        outstanding: result.outstanding,
      },
    });
  } catch (err) {
    console.error('Error collecting payment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cancel Delivery
exports.cancelDelivery = async (req, res) => {
  try {
    const { deliveryLogId, orderId, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
    }

    const delivery = await resolveDeliveryLog(deliveryLogId, orderId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found for this order' });
    }

    await delivery.populate('order');

    delivery.status = 'delivery_cancelled';
    delivery.paymentStatus = 'cancelled';
    delivery.cancellationReason = reason;
    delivery.cancelledAt = new Date();
    delivery.cancelledBy = req.user._id;
    delivery.totalPaymentCollected = 0;
    delivery.outstandingAmount = 0;
    delivery.paymentHistory = [];

    const order = delivery.order;
    order.status = 'cancelled';
    order.paymentStatus = 'cancelled';
    order.amountCollected = 0;
    order.outstandingAmount = 0;

    await delivery.save();
    await order.save();

    req.io?.emit('delivery:cancelled', {
      deliveryLogId: delivery._id,
      orderId: order._id,
      reason,
    });

    res.json({
      success: true,
      message: 'Delivery cancelled. No payment collected.',
      data: delivery,
    });
  } catch (err) {
    console.error('Error cancelling delivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark Items as Returned
exports.markItemsReturned = async (req, res) => {
  try {
    const { deliveryLogId, orderId, itemReturns } = req.body;

    const delivery = await resolveDeliveryLog(deliveryLogId, orderId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found for this order' });
    }

    await delivery.populate('order');

    const order = delivery.order;
    if (order?.orderType === 'pdf') {
      return res.status(400).json({
        success: false,
        message: 'Item returns are not applicable for PDF orders. Adjust payment amount instead.',
      });
    }

    if (!delivery.items?.length) {
      return res.status(400).json({
        success: false,
        message: 'No delivery items found for this order',
      });
    }

    let anyItemsReturned = false;
    for (const ret of itemReturns) {
      if (delivery.items[ret.itemIndex]) {
        delivery.items[ret.itemIndex].returnedQty = ret.returnedQty;
        delivery.items[ret.itemIndex].reason = ret.reason;
        anyItemsReturned = true;
      }
    }

    if (!anyItemsReturned) {
      return res.status(400).json({ success: false, message: 'No items marked as returned' });
    }

    const totalOrdered = delivery.items.reduce((s, i) => s + i.orderedQty, 0);
    const totalDelivered = delivery.items.reduce((s, i) => s + i.deliveredQty, 0);
    const totalReturned = delivery.items.reduce((s, i) => s + i.returnedQty, 0);

    if (totalDelivered + totalReturned === totalOrdered) {
      delivery.status = 'partial_delivery';
    }

    await delivery.save();

    for (let i = 0; i < order.items.length; i++) {
      const totalItemReturned = delivery.items[i]?.returnedQty || 0;
      order.items[i].returnedQuantity = totalItemReturned;
    }
    await order.save();

    req.io?.emit('items:returned', {
      deliveryLogId: delivery._id,
      orderId: order._id,
      itemsReturned: itemReturns,
    });

    res.json({
      success: true,
      message: 'Items marked as returned. Adjust payment accordingly.',
      data: {
        status: delivery.status,
        itemsReturned: itemReturns,
      },
    });
  } catch (err) {
    console.error('Error marking items returned:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Delivery Payment Status
exports.getDeliveryPaymentStatus = async (req, res) => {
  try {
    const { deliveryLogId } = req.params;

    const delivery = await DeliveryLog.findById(deliveryLogId)
      .populate('order', 'totalAmount orderNumber')
      .populate('deliveryStaff', 'name phone');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    res.json({
      success: true,
      data: {
        orderNumber: delivery.order.orderNumber,
        orderAmount: delivery.order.totalAmount,
        deliveryStatus: delivery.status,
        paymentStatus: delivery.paymentStatus,
        amountCollected: delivery.totalPaymentCollected,
        outstandingAmount: delivery.outstandingAmount,
        paymentHistory: delivery.paymentHistory,
      },
    });
  } catch (err) {
    console.error('Error getting payment status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Outstanding Payments
exports.getOutstandingPayments = async (req, res) => {
  try {
    const outstandingDeliveries = await DeliveryLog.find({
      paymentStatus: { $in: ['not_collected', 'partial_collected'] },
      status: { $in: ['delivered', 'completed'] },
    })
      .populate('order', 'orderNumber totalAmount')
      .populate('deliveryStaff', 'name phone')
      .populate('store', 'name ownerName phone')
      .sort({ deliveredAt: -1 });

    const summary = {
      totalOutstanding: 0,
      notCollected: [],
      partialCollected: [],
    };

    for (const delivery of outstandingDeliveries) {
      const record = {
        deliveryLogId: delivery._id,
        orderNumber: delivery.order.orderNumber,
        store: delivery.store.name,
        staff: delivery.deliveryStaff.name,
        totalAmount: delivery.order.totalAmount,
        collected: delivery.totalPaymentCollected || 0,
        outstanding: delivery.outstandingAmount,
        deliveredAt: delivery.deliveredAt,
      };

      if (delivery.paymentStatus === 'not_collected') {
        summary.notCollected.push(record);
      } else {
        summary.partialCollected.push(record);
      }

      summary.totalOutstanding += delivery.outstandingAmount || 0;
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('Error getting outstanding payments:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};