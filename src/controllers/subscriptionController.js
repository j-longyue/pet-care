const subscriptionService = require('../services/subscriptionService');
const kofiProvider = require('../providers/kofiProvider');
const googlePlayProvider = require('../providers/googlePlayProvider');

const sendError = (res, error) => {
  if (Number.isInteger(error.status)) return res.status(error.status).json({ error: error.message });
  console.error('[subscriptions]', error);
  return res.status(500).json({ error: 'Internal error.' });
};

const kofiWebhook = async (req, res) => {
  try {
    const event = kofiProvider.parse(req.body);
    if (!event) return res.status(200).json({ ignored: true });
    return res.status(200).json(await subscriptionService.processEvent(event));
  } catch (error) {
    return sendError(res, error);
  }
};

const googlePlayWebhook = async (req, res) => {
  try {
    const secret = process.env.GOOGLE_PUBSUB_TOKEN;
    if (!secret || req.query.token !== secret) return res.status(401).json({ error: 'Unauthorized.' });

    const event = await googlePlayProvider.parse(req.body);
    if (!event) return res.status(200).json({ ignored: true });
    return res.status(200).json(await subscriptionService.processEvent(event));
  } catch (error) {
    return sendError(res, error);
  }
};

const getMine = async (req, res) => {
  try {
    return res.status(200).json(await subscriptionService.getMySubscription(req.user));
  } catch (error) {
    return sendError(res, error);
  }
};

const simulate = async (req, res) => {
  if (process.env.PAYMENTS_MODE !== 'mock') return res.status(404).json({ error: 'Not found.' });
  try {
    return res.status(200).json(await subscriptionService.simulate(req.body || {}));
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { kofiWebhook, googlePlayWebhook, getMine, simulate };