const db = require('../config/db');
const { PLAN_LIMITS } = require('../config/plans');
const { LIMIT_RULES, TIMEZONE } = require('../config/planLimitRules');

const MONTH_START_SQL = `(date_trunc('month', NOW() AT TIME ZONE '${TIMEZONE}') AT TIME ZONE '${TIMEZONE}')`;

const lockSubject = async (client, rule, { userId, petId }) => {
  if (rule.scope === 'pet') {
    const { rows } = await client.query(
      `SELECT p.id AS subject_id, u.plan,
              (SELECT COUNT(*)::int FROM pets older
                WHERE older.created_by = p.created_by
                  AND older.deleted_at IS NULL
                  AND (older.created_at, older.id) < (p.created_at, p.id)) AS owner_rank
       FROM pets p
       JOIN users u ON u.id = p.created_by
       WHERE p.id = $1 AND p.deleted_at IS NULL
       FOR UPDATE OF p`,
      [petId]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    'SELECT id AS subject_id, plan FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );
  return rows[0];
};

const runWithLimit = async ({ limitKey, userId, petId }, insertFn) => {
  const rule = LIMIT_RULES[limitKey];
  if (!rule) throw new Error(`Unknown plan limit: ${limitKey}`);

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const subject = await lockSubject(client, rule, { userId, petId });
    if (!subject) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    if (rule.scope === 'pet') {
      const maxPets = PLAN_LIMITS[subject.plan]?.maxPets ?? 0;
      if (subject.owner_rank >= maxPets) {
        await client.query('ROLLBACK');
        return { readOnly: true };
      }
    }

    const max = PLAN_LIMITS[subject.plan]?.[limitKey] ?? 0;

    const conditions = [`${rule.ownerColumn} = $1`];
    if (rule.softDelete) conditions.push('deleted_at IS NULL');
    if (rule.scope === 'user_month') conditions.push(`created_at >= ${MONTH_START_SQL}`);

    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS total FROM ${rule.table} WHERE ${conditions.join(' AND ')}`,
      [subject.subject_id]
    );

    if (rows[0].total >= max) {
      await client.query('ROLLBACK');
      return { limitReached: true, limitKey, max, current: rows[0].total };
    }

    const result = await insertFn(client);

    await client.query('COMMIT');
    return { result };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { runWithLimit };