const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/my-orders', ctrl.getMyOrders);
router.get('/', ctrl.getOrders);
router.post('/', adminOnly, ctrl.createOrder);
router.get('/:id', ctrl.getOrder);
router.put('/:id', adminOnly, ctrl.updateOrder);
router.put('/:id/assign', adminOnly, ctrl.assignStaff);
router.delete('/:id', adminOnly, ctrl.deleteOrder);
module.exports = router;
