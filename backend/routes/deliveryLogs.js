const express = require('express');
const router = express.Router();

const deliveryLogController = require('../controllers/deliveryLogController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Protect all routes
router.use(protect);

// ✅ ADD THIS (IMPORTANT)
router.get('/my', deliveryLogController.getMyDeliveries);
router.get('/order/:orderId', deliveryLogController.getByOrder);

// Existing routes
router.get('/', deliveryLogController.getDeliveryLogs);
router.post('/', deliveryLogController.createDeliveryLog);
router.get('/:id', deliveryLogController.getDeliveryLog);
router.put('/:id/status', deliveryLogController.updateDeliveryStatus);
router.post('/:id/proof', upload.single('proof'), deliveryLogController.uploadProof);

module.exports = router;