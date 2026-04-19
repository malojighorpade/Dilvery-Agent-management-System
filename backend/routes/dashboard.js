const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/admin', adminOnly, ctrl.getAdminDashboard);
router.get('/staff', ctrl.getStaffDashboard);
module.exports = router;
