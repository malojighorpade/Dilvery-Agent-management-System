const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/summary', ctrl.getPaymentSummary);
router.get('/', ctrl.getPayments);
router.post('/', ctrl.createPayment);
router.get('/:id', ctrl.getPayment);
module.exports = router;
