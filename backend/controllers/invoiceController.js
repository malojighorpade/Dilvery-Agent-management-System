const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

exports.createInvoice = async (req, res) => {
  try {
    const { order, store, industry, items, totalAmount, dueDate } = req.body;

    const invoiceData = {
      order,
      store,
      industry,
      totalAmount: totalAmount || 0,
      subtotal: totalAmount || 0,
      taxRate: 18,
      taxAmount: Math.round((totalAmount || 0) * 0.18),
      dueDate,
      createdBy: req.user._id,
    };

    if (items && items.length > 0) {
      invoiceData.items = items;
    }

    const invoice = await Invoice.create(invoiceData);
    await invoice.populate(['order', 'store', 'industry', 'items.product', 'createdBy']);

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { order, store, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (order) filter.order = order;
    if (store) filter.store = store;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('order', 'orderNumber')
        .populate('store', 'name')
        .populate('industry', 'name')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(filter),
    ]);

    res.json({ success: true, count: invoices.length, total, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('order')
      .populate('store')
      .populate('industry')
      .populate('items.product')
      .populate('createdBy', 'name');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('order')
      .populate('store')
      .populate('industry');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};