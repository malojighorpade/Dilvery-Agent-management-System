const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/brandController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getBrands);
router.post('/', adminOnly, ctrl.createBrand);
router.get('/:id', ctrl.getBrand);
router.put('/:id', adminOnly, ctrl.updateBrand);
router.delete('/:id', adminOnly, ctrl.deleteBrand);
module.exports = router;
