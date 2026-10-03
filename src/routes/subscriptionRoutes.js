const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriptionController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.post('/webhooks/kofi', express.urlencoded({ extended: true }), controller.kofiWebhook);
router.post('/webhooks/google-play', express.json(), controller.googlePlayWebhook);

router.get('/me', requireAuth, controller.getMine);

router.post('/mock/simulate', requireAuth, requireAdmin, controller.simulate);

module.exports = router;