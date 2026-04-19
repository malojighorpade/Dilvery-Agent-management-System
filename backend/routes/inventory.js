const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getInventory);
router.get('/alerts/low-stock', ctrl.getLowStockAlerts);
router.get('/product/:productId', ctrl.getInventoryItem);
router.post('/adjust', adminOnly, ctrl.adjustStock);
module.exports = router;
