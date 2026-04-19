const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.getProducts);
router.post('/', adminOnly, ctrl.createProduct);
router.get('/:id', ctrl.getProduct);
router.put('/:id', adminOnly, ctrl.updateProduct);
router.delete('/:id', adminOnly, ctrl.deleteProduct);
module.exports = router;
