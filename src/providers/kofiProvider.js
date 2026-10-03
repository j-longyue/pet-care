const crypto = require('crypto');
const { KOFI_TIER_TO_PRODUCT, KOFI_GRACE_DAYS } = require('../config/subscriptionProducts');
const { addMonths, addDays } = require('../utils/dates');
const { httpError } = require('../utils/httpError');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const parse = (body) => {
  let data;
  try {
    data = typeof body?.data === 'string' ? JSON.parse(body.data) : body?.data;
  } catch {
    data = null;
  }
  if (!data) throw httpError('Invalid Ko-fi payload.', 400);

  const token = process.env.KOFI_VERIFICATION_TOKEN;
  if (!token || !safeEqual(data.verification_token, token)) {
    throw httpError('Invalid verification token.', 401);
  }

  if (data.type !== 'Subscription' || data.is_subscription_payment === false) return null;

  const productId = KOFI_TIER_TO_PRODUCT[String(data.tier_name || '').toLowerCase()];
  if (!productId) throw httpError(`Unknown Ko-fi tier: ${data.tier_name}`, 422);

  const paidAt = new Date(data.timestamp);
  if (Number.isNaN(paidAt.getTime())) throw httpError('Invalid Ko-fi timestamp.', 400);

  const email = String(data.email || '').trim().toLowerCase();

  return {
    provider: 'kofi',
    eventId: data.message_id,
    type: data.is_first_subscription_payment ? 'activated' : 'renewed',
    providerSubscriptionId: `kofi:${email}`,
    productId,
    userEmail: email,
    periodEnd: addDays(addMonths(paidAt, 1), KOFI_GRACE_DAYS),
    raw: data,
  };
};

module.exports = { parse };