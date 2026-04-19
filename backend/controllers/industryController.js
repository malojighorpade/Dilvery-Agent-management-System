const Industry = require('../models/Industry');

exports.getIndustries = async (req, res) => {
  try {
    const { isActive, search } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
    ];
    const industries = await Industry.find(filter).populate('brands', 'name').sort({ name: 1 });
    res.json({ success: true, count: industries.length, data: industries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getIndustry = async (req, res) => {
  try {
    const industry = await Industry.findById(req.params.id).populate('brands');
    if (!industry) return res.status(404).json({ success: false, message: 'Industry not found' });
    res.json({ success: true, data: industry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createIndustry = async (req, res) => {
  try {
    const industry = await Industry.create(req.body);
    res.status(201).json({ success: true, data: industry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateIndustry = async (req, res) => {
  try {
    const industry = await Industry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('brands', 'name');
    if (!industry) return res.status(404).json({ success: false, message: 'Industry not found' });
    res.json({ success: true, data: industry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteIndustry = async (req, res) => {
  try {
    await Industry.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Industry deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
