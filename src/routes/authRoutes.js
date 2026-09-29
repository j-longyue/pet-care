const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;