const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// 👨‍💼 STAFF
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/today', ctrl.getTodayStatus);
router.get('/my', ctrl.getMyAttendance);

// 🧑‍💻 ADMIN
router.get('/', adminOnly, ctrl.getAllAttendance);

// ✅ NEW: APPROVAL ROUTES
router.put('/approve/:id', adminOnly, ctrl.approveAttendance);
router.put('/reject/:id', adminOnly, ctrl.rejectAttendance);

module.exports = router;