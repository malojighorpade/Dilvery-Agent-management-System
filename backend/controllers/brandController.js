const Brand = require('../models/Brand');

exports.getBrands = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };
    const brands = await Brand.find(filter).sort({ name: 1 });
    res.json({ success: true, count: brands.length, data: brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, data: brand });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, data: brand });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, message: 'Brand deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
