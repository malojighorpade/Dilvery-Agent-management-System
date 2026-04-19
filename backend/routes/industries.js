const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/industryController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getIndustries);
router.post('/', adminOnly, ctrl.createIndustry);
router.get('/:id', ctrl.getIndustry);
router.put('/:id', adminOnly, ctrl.updateIndustry);
router.delete('/:id', adminOnly, ctrl.deleteIndustry);
module.exports = router;
