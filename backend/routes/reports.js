const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.get('/sales', ctrl.getSalesReport);
router.get('/deliveries', ctrl.getDeliveryReport);
router.get('/payments', ctrl.getPaymentReport);
router.get('/export', ctrl.exportCSV);
module.exports = router;
