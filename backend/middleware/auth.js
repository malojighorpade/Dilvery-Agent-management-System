const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 Protect middleware (Authentication)
const protect = async (req, res, next) => {
  try {
    let token;

    // 🔹 Extract token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 🔹 No token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    // 🔹 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔹 Get user
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized or inactive',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('🔥 AUTH ERROR:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token invalid or expired',
    });
  }
};

// 🔐 Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - user missing',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
};

// 🔐 Staff or Admin middleware
const staffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - user missing',
    });
  }

  const allowedRoles = ['admin', 'delivery_agent']; // ✅ standardized

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  }

  next();
};

module.exports = { protect, adminOnly, staffOrAdmin };