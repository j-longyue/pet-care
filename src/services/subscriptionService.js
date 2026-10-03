const userRepository = require('../repositories/userRepository');
const subscriptionRepository = require('../repositories/subscriptionRepository');
const { PRODUCTS } = require('../config/subscriptionProducts');
const { buildEvent } = require('../providers/mockProvider');
const { addMonths } = require('../utils/dates');
const { httpError } = require('../utils/httpError');

const STATUS_BY_TYPE = {
  activated: 'active',
  renewed: 'active',
  canceled: 'canceled',
  past_due: 'past_due',
  expired: 'canceled',
};

const resolveUser = async (event) => {
  if (event.userId) return userRepository.findById(event.userId);
  if (event.userEmail) return userRepository.findByEmailOrUsername(event.userEmail, null);
  return null;
};

const processEvent = async (event) => {
  if (!STATUS_BY_TYPE[event.type]) throw httpError('Invalid event type.', 400);

  const product = PRODUCTS[event.productId];
  if (!product) throw httpError(`Unknown product: ${event.productId}`, 422);

  const isNew = await subscriptionRepository.registerEvent(event);
  if (!isNew) return { status: 'duplicate' };

  try {
    const user = await resolveUser(event);
    if (!user) throw httpError('User not found for this subscription.', 404);

    const existing = await subscriptionRepository.findByProviderId(event.provider, event.providerSubscriptionId);
    const periodEnd = event.periodEnd ?? existing?.current_period_end ?? addMonths(new Date(), product.months);
    const status = STATUS_BY_TYPE[event.type];

    let canceledAt = existing?.canceled_at ?? null;
    if (event.type === 'canceled') canceledAt = new Date();
    if (event.type === 'activated' || event.type === 'renewed') canceledAt = null;

    await subscriptionRepository.upsert({
      userId: user.id,
      provider: event.provider,
      providerSubscriptionId: event.providerSubscriptionId,
      productId: event.productId,
      plan: product.plan,
      status,
      periodEnd,
      canceledAt,
    });

    if (event.type === 'expired') {
      await subscriptionRepository.applyToUser(user.id, { plan: 'free', status: 'canceled', expiresAt: null });
      return { status: 'processed', userId: user.id, plan: 'free', expiresAt: null };
    }

    await subscriptionRepository.applyToUser(user.id, { plan: product.plan, status, expiresAt: periodEnd });
    return { status: 'processed', userId: user.id, plan: product.plan, planStatus: status, expiresAt: periodEnd };
  } catch (error) {
    await subscriptionRepository.unregisterEvent(event.provider, event.eventId); // permite retry
    throw error;
  }
};

const getMySubscription = async (requestingUser) => {
  const user = await userRepository.findById(requestingUser.id);
  if (!user) throw httpError('User not found', 404);

  return {
    plan: user.plan,
    plan_status: user.plan_status,
    plan_expires_at: user.plan_expires_at ? new Date(user.plan_expires_at).toISOString() : null,
    subscriptions: await subscriptionRepository.findByUser(user.id),
  };
};

const simulate = async ({ provider, userId, productId, type, expiresAt }) => {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw httpError('Invalid userId.', 400);

  const user = await userRepository.findById(id);
  if (!user) throw httpError('User not found', 404);

  const event = await buildEvent({ provider, user, productId, type, expiresAt });
  return processEvent(event);
};

const startExpirationJob = (intervalMs = 10 * 60 * 1000) => {
  const run = () =>
    subscriptionRepository
      .expireDue()
      .then((n) => n && console.log(`[subscriptions] ${n} plan(s) expired.`))
      .catch((e) => console.error('[subscriptions] expiration job failed:', e.message));

  run();
  return setInterval(run, intervalMs).unref();
};

module.exports = { processEvent, getMySubscription, simulate, startExpirationJob };