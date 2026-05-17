const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// ✅ RULE 1: Specific static routes FIRST
router.get('/summary', ctrl.getPaymentSummary);

// ✅ RULE 2: Specific routes with params
router.get('/delivery/:deliveryLogId/status', ctrl.getDeliveryPaymentStatus);
router.get('/admin/outstanding', adminOnly, ctrl.getOutstandingPayments);

// ✅ POST action routes before generic /:id
router.post('/collect-partial', ctrl.collectPartialPayment);
router.post('/cancel-delivery', ctrl.cancelDelivery);
router.post('/mark-items-returned', ctrl.markItemsReturned);

router.get('/', ctrl.getPayments);
router.post('/', ctrl.createPayment);
router.get('/:id', ctrl.getPayment);

module.exports = router;