const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/today', ctrl.getTodayStatus);
router.get('/my', ctrl.getMyAttendance);
router.get('/', adminOnly, ctrl.getAllAttendance);
module.exports = router;
