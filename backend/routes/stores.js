const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/storeController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/routes', ctrl.getRoutes);
router.get('/', ctrl.getStores);
router.post('/', adminOnly, ctrl.createStore);
router.get('/:id', ctrl.getStore);
router.put('/:id', adminOnly, ctrl.updateStore);
router.delete('/:id', adminOnly, ctrl.deleteStore);
module.exports = router;
