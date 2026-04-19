const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getInvoices);
router.post('/', adminOnly, ctrl.createInvoice);
router.get('/:id', ctrl.getInvoice);
router.put('/:id', adminOnly, ctrl.updateInvoice);
router.put('/:id/mark-paid', adminOnly, ctrl.markPaid);
router.delete('/:id', adminOnly, ctrl.deleteInvoice);
module.exports = router;
