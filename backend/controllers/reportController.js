const Order = require('../models/Order');
const { Payment } = require('../models/Payment');
const DeliveryLog = require('../models/DeliveryLog');
const Attendance = require('../models/Attendance');
const { Parser } = require('json2csv');

const dateFilter = (start, end) => {
  const f = {};
  if (start) f.$gte = new Date(start);
  if (end) f.$lte = new Date(end);
  return Object.keys(f).length ? f : undefined;
};

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const match = {};
    const df = dateFilter(startDate, endDate);
    if (df) match.createdAt = df;

    const format = groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%U' : '%Y-%m-%d';
    const report = await Payment.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDeliveryReport = async (req, res) => {
  try {
    const { startDate, endDate, staffId } = req.query;
    const match = {};
    const df = dateFilter(startDate, endDate);
    if (df) match.createdAt = df;
    if (staffId) match.deliveryStaff = require('mongoose').Types.ObjectId(staffId);

    const report = await DeliveryLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        staff: { $addToSet: '$deliveryStaff' },
      }},
    ]);

    const staffPerf = await DeliveryLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$deliveryStaff',
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
      }},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $project: { staffName: '$staff.name', total: 1, delivered: 1, failed: 1 } },
      { $sort: { delivered: -1 } },
    ]);

    res.json({ success: true, data: { byStatus: report, byStaff: staffPerf } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPaymentReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    const df = dateFilter(startDate, endDate);
    if (df) match.createdAt = df;

    const byMode = await Payment.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const outstanding = await require('../models/Store').aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
    ]);

    res.json({ success: true, data: { byMode, totalOutstanding: outstanding[0]?.total || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    let data = [], fields = [];

    if (type === 'orders') {
      const orders = await Order.find(startDate ? { createdAt: { $gte: new Date(startDate), $lte: endDate ? new Date(endDate) : new Date() } } : {})
        .populate('industry', 'name').populate('assignedStaff', 'name').lean();
      data = orders.map(o => ({ OrderNo: o.orderNumber, Industry: o.industry?.name, Status: o.status, Amount: o.totalAmount, Staff: o.assignedStaff?.name, Date: o.createdAt }));
      fields = ['OrderNo', 'Industry', 'Status', 'Amount', 'Staff', 'Date'];
    } else if (type === 'payments') {
      const payments = await Payment.find(startDate ? { createdAt: { $gte: new Date(startDate) } } : {})
        .populate('store', 'name').populate('collectedBy', 'name').lean();
      data = payments.map(p => ({ PaymentNo: p.paymentNumber, Store: p.store?.name, Amount: p.amount, Mode: p.paymentMode, CollectedBy: p.collectedBy?.name, Date: p.createdAt }));
      fields = ['PaymentNo', 'Store', 'Amount', 'Mode', 'CollectedBy', 'Date'];
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
