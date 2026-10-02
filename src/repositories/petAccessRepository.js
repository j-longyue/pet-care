const db = require('../config/db');

const PERMISSION_COLUMNS = ['can_view', 'can_create', 'can_edit', 'can_delete'];

const SELECT_ACCESS = `
  SELECT a.*, u.username
  FROM pet_access a
  JOIN users u ON u.id = a.user_id
`;

const findByPetAndUser = async (petId, userId) => {
  const { rows } = await db.query(
    `${SELECT_ACCESS} WHERE a.pet_id = $1 AND a.user_id = $2`,
    [petId, userId]
  );
  return rows[0];
};

const createWithLimit = async ({ petId, userId, permissions, grantedBy, maxAccess }) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM pets WHERE id = $1 FOR UPDATE', [petId]);

    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS total FROM pet_access WHERE pet_id = $1',
      [petId]
    );

    if (rows[0].total >= maxAccess) {
      await client.query('ROLLBACK');
      return { limitReached: true };
    }

    await client.query(
      `INSERT INTO pet_access (pet_id, user_id, can_view, can_create, can_edit, can_delete, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        petId,
        userId,
        permissions.can_view,
        permissions.can_create,
        permissions.can_edit,
        permissions.can_delete,
        grantedBy,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  return { access: await findByPetAndUser(petId, userId) };
};

const findAllByPet = async ({ petId, limit, offset }) => {
  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `${SELECT_ACCESS}
       WHERE a.pet_id = $1
       ORDER BY a.created_at ASC, a.id ASC
       LIMIT $2 OFFSET $3`,
      [petId, limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM pet_access WHERE pet_id = $1', [petId]),
  ]);

  return { items: itemsResult.rows, total: countResult.rows[0].total };
};

const updatePermissions = async (petId, userId, permissions) => {
  const entries = Object.entries(permissions).filter(([key]) => PERMISSION_COLUMNS.includes(key));
  if (entries.length === 0) return undefined;

  const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);

  const { rows } = await db.query(
    `UPDATE pet_access
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE pet_id = $${values.length + 1} AND user_id = $${values.length + 2}
     RETURNING id`,
    [...values, petId, userId]
  );

  return rows[0] ? findByPetAndUser(petId, userId) : undefined;
};

const remove = async (petId, userId) => {
  const { rows } = await db.query(
    'DELETE FROM pet_access WHERE pet_id = $1 AND user_id = $2 RETURNING id',
    [petId, userId]
  );
  return rows[0];
};

module.exports = {
  findByPetAndUser,
  createWithLimit,
  findAllByPet,
  updatePermissions,
  remove,
};