const User = require('../models/User');
const bcrypt = require('bcryptjs');

// =====================================
// ✅ GET USERS
// =====================================
exports.getUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const users = await User.find(filter)
      .select("-password") // 🔒 hide password
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ✅ GET USER
// =====================================
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// 🔥 FIXED CREATE USER (IMPORTANT)
// =====================================
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // ✅ validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // ✅ check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "staff",
      phone,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("CREATE USER ERROR:", err); // 🔥 DEBUG

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// =====================================
// ✅ UPDATE USER
// =====================================
exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({ success: true, data: user });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// =====================================
// ✅ DELETE USER (SOFT DELETE)
// =====================================
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ✅ STAFF LIST
// =====================================
exports.getStaffList = async (req, res) => {
  try {
    const staff = await User.find({
      role: 'staff',
      isActive: true
    }).select('name email phone');

    res.json({ success: true, data: staff });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};