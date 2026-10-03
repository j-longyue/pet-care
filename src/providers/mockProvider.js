const crypto = require('crypto');
const kofi = require('./kofiProvider');
const googlePlay = require('./googlePlayProvider');
const { PRODUCTS, KOFI_TIER_TO_PRODUCT } = require('../config/subscriptionProducts');
const { addMonths } = require('../utils/dates');
const { httpError } = require('../utils/httpError');

const GOOGLE_TYPE = { activated: 4, renewed: 2, canceled: 3, past_due: 6, expired: 13 };

const buildEvent = async ({ provider, user, productId, type, expiresAt }) => {
  const product = PRODUCTS[productId];
  if (!product) throw httpError(`Unknown product: ${productId}`, 422);
  if (!(type in GOOGLE_TYPE)) throw httpError('Invalid event type.', 400);

  const periodEnd = expiresAt ? new Date(expiresAt) : addMonths(new Date(), product.months);
  if (Number.isNaN(periodEnd.getTime())) throw httpError('Invalid expiresAt.', 400);

  let event;

  if (provider === 'kofi') {
    if (type === 'activated' || type === 'renewed') {
      const tier = Object.keys(KOFI_TIER_TO_PRODUCT).find((t) => KOFI_TIER_TO_PRODUCT[t] === productId);
      if (!tier) throw httpError('This product has no Ko-fi tier.', 422);

      event = kofi.parse({
        data: JSON.stringify({
          verification_token: process.env.KOFI_VERIFICATION_TOKEN,
          message_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'Subscription',
          is_subscription_payment: true,
          is_first_subscription_payment: type === 'activated',
          email: user.email,
          tier_name: tier,
          amount: '5.00',
          currency: 'USD',
          kofi_transaction_id: crypto.randomUUID(),
        }),
      });
    } else {
      event = {
        provider: 'kofi',
        eventId: crypto.randomUUID(),
        type,
        providerSubscriptionId: `kofi:${user.email}`,
        productId,
        userEmail: user.email,
        periodEnd: null,
      };
    }
  } else if (provider === 'google_play') {
    const data = Buffer.from(
      JSON.stringify({
        version: '1.0',
        packageName: 'com.mock.app',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: GOOGLE_TYPE[type],
          purchaseToken: `mock_${user.id}_${productId}`,
          subscriptionId: productId,
        },
      })
    ).toString('base64');

    event = await googlePlay.parse(
      { message: { messageId: crypto.randomUUID(), data } },
      {
        fetchSubscription: async () => ({
          lineItems: [{ productId, expiryTime: periodEnd.toISOString() }],
          externalAccountIdentifiers: { obfuscatedExternalAccountId: String(user.id) },
        }),
      }
    );
  } else {
    throw httpError('Invalid provider. Use "kofi" or "google_play".', 400);
  }

  if (event && expiresAt) event.periodEnd = periodEnd;
  return event;
};

module.exports = { buildEvent };