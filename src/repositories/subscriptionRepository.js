const db = require('../config/db');

const registerEvent = async ({ provider, eventId, type, raw }) => {
  const { rows } = await db.query(
    `INSERT INTO payment_events (provider, event_id, type, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [provider, eventId, type, JSON.stringify(raw ?? null)]
  );
  return rows.length > 0;
};

const unregisterEvent = async (provider, eventId) => {
  await db.query('DELETE FROM payment_events WHERE provider = $1 AND event_id = $2', [provider, eventId]);
};

const findByProviderId = async (provider, providerSubscriptionId) => {
  const { rows } = await db.query(
    'SELECT * FROM subscriptions WHERE provider = $1 AND provider_subscription_id = $2',
    [provider, providerSubscriptionId]
  );
  return rows[0];
};

const upsert = async ({ userId, provider, providerSubscriptionId, productId, plan, status, periodEnd, canceledAt }) => {
  const { rows } = await db.query(
    `INSERT INTO subscriptions
       (user_id, provider, provider_subscription_id, product_id, plan, status, current_period_end, canceled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       product_id = EXCLUDED.product_id,
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       canceled_at = EXCLUDED.canceled_at,
       updated_at = NOW()
     RETURNING *`,
    [userId, provider, providerSubscriptionId, productId, plan, status, periodEnd, canceledAt]
  );
  return rows[0];
};

const applyToUser = async (userId, { plan, status, expiresAt }) => {
  await db.query(
    'UPDATE users SET plan = $1, plan_status = $2, plan_expires_at = $3 WHERE id = $4',
    [plan, status, expiresAt, userId]
  );
};

const findByUser = async (userId) => {
  const { rows } = await db.query(
    `SELECT id, provider, product_id, plan, status, current_period_end, canceled_at
     FROM subscriptions WHERE user_id = $1 ORDER BY current_period_end DESC`,
    [userId]
  );
  return rows;
};

const expireDue = async () => {
  await db.query(
    `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
     WHERE current_period_end < NOW() AND status <> 'canceled'`
  );
  const { rowCount } = await db.query(
    `UPDATE users
     SET plan = 'free', plan_status = 'canceled', plan_expires_at = NULL
     WHERE plan <> 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at < NOW()`
  );
  return rowCount;
};

module.exports = {
  registerEvent,
  unregisterEvent,
  findByProviderId,
  upsert,
  applyToUser,
  findByUser,
  expireDue,
};