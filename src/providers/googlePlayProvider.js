const { httpError } = require('../utils/httpError');

const TYPE_MAP = {
  1: 'renewed',
  2: 'renewed',
  3: 'canceled',
  4: 'activated',
  5: 'past_due',
  6: 'past_due',
  7: 'renewed',
  12: 'expired',
  13: 'expired',
};

const fetchFromGoogle = async () => {
  throw httpError('Google Play API not configured yet.', 501);
};

const parse = async (body, { fetchSubscription = fetchFromGoogle } = {}) => {
  const encoded = body?.message?.data;
  if (!encoded) throw httpError('Invalid Pub/Sub message.', 400);

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw httpError('Invalid Pub/Sub payload.', 400);
  }

  const notification = payload.subscriptionNotification;
  const type = TYPE_MAP[notification?.notificationType];
  if (!notification || !type) return null;

  const sub = await fetchSubscription(payload.packageName, notification.purchaseToken);
  const line = sub?.lineItems?.[0];
  if (!line) throw httpError('Subscription has no line items.', 422);

  const userId = Number(sub.externalAccountIdentifiers?.obfuscatedExternalAccountId);

  return {
    provider: 'google_play',
    eventId: body.message.messageId,
    type,
    providerSubscriptionId: notification.purchaseToken,
    productId: line.productId,
    userId: Number.isInteger(userId) ? userId : undefined,
    periodEnd: line.expiryTime ? new Date(line.expiryTime) : null,
    raw: payload,
  };
};

module.exports = { parse };