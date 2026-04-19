const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Store = require('../models/Store');

exports.getPayments = async (req, res) => {
  try {
    const { paymentMode, status, store, collectedBy, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (paymentMode) filter.paymentMode = paymentMode;
    if (status) filter.status = status;
    if (store) filter.store = store;
    if (collectedBy) filter.collectedBy = collectedBy;
    if (req.user.role === 'staff') filter.collectedBy = req.user._id;
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
    const payment = await Payment.create({ ...req.body, collectedBy: req.user._id });

    // Update invoice status if linked
    if (payment.invoice) {
      await Invoice.findByIdAndUpdate(payment.invoice, { status: 'paid', paidAt: new Date() });
    }

    // Update store outstanding balance
    await Store.findByIdAndUpdate(payment.store, { $inc: { outstandingBalance: -payment.amount } });

    req.io?.emit('payment:collected', payment);
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
    if (req.user.role === 'staff') match.collectedBy = req.user._id;

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
