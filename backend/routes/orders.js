// backend/routes/orders.js - FINAL VERSION

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const uploadPDF = require('../middleware/uploadPDF');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// ✅ Create order - handles both JSON (manual) and FormData (PDF)
router.post('/', adminOnly, uploadPDF.single('pdf'), ctrl.createOrder);

// Get staff's assigned orders
router.get('/my-orders', ctrl.getMyOrders);

// Get all orders (admin)
router.get('/', ctrl.getOrders);

// Get single order
router.get('/:id', ctrl.getOrder);

// Update order
router.put('/:id', adminOnly, ctrl.updateOrder);

// Assign staff to order
router.put('/:id/assign', adminOnly, ctrl.assignStaff);

// Delete order
router.delete('/:id', adminOnly, ctrl.deleteOrder);

// ✅ Optional: Standalone PDF upload endpoint (if needed separately)
router.post('/upload-pdf', uploadPDF.single('pdf'), ctrl.uploadPDF);

module.exports = router;