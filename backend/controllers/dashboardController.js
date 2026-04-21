const Order = require('../models/Order');
const {Payment} = require('../models/Payment');
const DeliveryLog = require('../models/DeliveryLog');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const Store = require('../models/Store');

exports.getAdminDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
    

    const [
      totalOrders, pendingOrders, deliveredToday,
      monthRevenue, lastMonthRevenue,
      totalStaff, activeStores,
      ordersByStatus, revenueByDay, topProducts, lowStockCount,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
      DeliveryLog.countDocuments({ status: 'delivered', deliveredAt: { $gte: today } }),
      Payment.aggregate([{ $match: { createdAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.countDocuments({ role: 'staff', isActive: true }),
      Store.countDocuments({ isActive: true }),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      DeliveryLog.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalDelivered: { $sum: '$items.deliveredQty' } } },
        { $sort: { totalDelivered: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { name: '$product.name', sku: '$product.sku', totalDelivered: 1 } },
      ]),
      Inventory.countDocuments({ $expr: { $lte: ['$currentStock', '$reorderLevel'] } }),
    ]);

    const currentRevenue = monthRevenue[0]?.total || 0;
    const prevRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = prevRevenue ? (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders, pendingOrders, deliveredToday,
          monthRevenue: currentRevenue,
          revenueGrowth,
          totalStaff,
          activeStores,
          lowStockCount,
        },
        ordersByStatus,
        revenueByDay,
        topProducts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getStaffDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [
      assignedOrders, deliveredToday,
      pendingDeliveries, todayPayments,
    ] = await Promise.all([
      Order.countDocuments({ assignedStaff: req.user._id, status: { $in: ['processing', 'dispatched'] } }),
      DeliveryLog.countDocuments({ deliveryStaff: req.user._id, status: 'delivered', deliveredAt: { $gte: today } }),
      DeliveryLog.countDocuments({ deliveryStaff: req.user._id, status: { $in: ['pending', 'in_transit'] } }),
      Payment.aggregate([
        { $match: { collectedBy: req.user._id, createdAt: { $gte: today } } },
        { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);
    

    res.json({
      success: true,
      data: { assignedOrders, deliveredToday, pendingDeliveries, todayPayments },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
  
};

