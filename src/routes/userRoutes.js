const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, userController.createUser);

router.get('/users-list', requireAuth, userController.getUsers);
router.get('/deleted-log', requireAuth, userController.getDeletedUsersLog);
router.get('/:id', requireAuth, userController.getUserById);

router.put('/:id', requireAuth, userController.updateUser);

router.delete('/:id', requireAuth, userController.deleteUser);

router.patch('/:id/plan', requireAuth, requireAdmin, userController.updateUserPlan);

module.exports = router;