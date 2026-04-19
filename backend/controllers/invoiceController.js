const Invoice = require('../models/Invoice');

exports.getInvoices = async (req, res) => {
  try {
    const { status, store, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (store) filter.store = store;
    if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('store', 'name ownerName phone')
        .populate('industry', 'name')
        .populate('order', 'orderNumber')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(filter),
    ]);
    res.json({ success: true, data: invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('store')
      .populate('industry')
      .populate('order')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const body = req.body;
    const subtotal = body.items.reduce((s, i) => s + i.total, 0);
    const taxAmount = (subtotal * (body.taxRate || 18)) / 100;
    const totalAmount = subtotal + taxAmount - (body.discount || 0);
    const invoice = await Invoice.create({ ...body, subtotal, taxAmount, totalAmount, createdBy: req.user._id });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete paid invoice' });
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
