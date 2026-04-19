const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.get('/staff/list', ctrl.getStaffList);
router.get('/', adminOnly, ctrl.getUsers);
router.post('/', adminOnly, ctrl.createUser);
router.get('/:id', adminOnly, ctrl.getUser);
router.put('/:id', adminOnly, ctrl.updateUser);
router.delete('/:id', adminOnly, ctrl.deleteUser);
module.exports = router;
