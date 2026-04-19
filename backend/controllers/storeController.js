const Store = require('../models/Store');

exports.getStores = async (req, res) => {
  try {
    const { isActive, route, assignedStaff, search } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (route) filter.route = route;
    if (assignedStaff) filter.assignedStaff = assignedStaff;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
    ];
    const stores = await Store.find(filter).populate('assignedStaff', 'name phone').sort({ name: 1 });
    res.json({ success: true, count: stores.length, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate('assignedStaff', 'name phone email');
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStore = async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.status(201).json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateStore = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('assignedStaff', 'name phone');
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteStore = async (req, res) => {
  try {
    await Store.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Store deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoutes = async (req, res) => {
  try {
    const routes = await Store.distinct('route', { route: { $ne: null, $ne: '' } });
    res.json({ success: true, data: routes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
