const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/deliveryLogController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);
router.get('/my', ctrl.getMyDeliveries);
router.get('/', ctrl.getDeliveryLogs);
router.post('/', ctrl.createDeliveryLog);
router.get('/:id', ctrl.getDeliveryLog);
router.put('/:id/status', ctrl.updateDeliveryStatus);
router.post('/:id/proof', upload.single('proof'), ctrl.uploadProof);
module.exports = router;
