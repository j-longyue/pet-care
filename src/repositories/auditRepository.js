const db = require('../config/db');

// ---- User ---- //
const logUserDeletion = async ({
  deletedUserId,
  deletedUserName,
  deletedUserEmail,
  deletedUserRole,
  deletedById,
  deletedByName,
  deletedByRole,
}) => {
  const { rows } = await db.query(
    `INSERT INTO deleted_users_log
       (deleted_user_id, deleted_user_name, deleted_user_email, deleted_user_role,
        deleted_by_id, deleted_by_name, deleted_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [deletedUserId, deletedUserName, deletedUserEmail, deletedUserRole,
     deletedById, deletedByName, deletedByRole]
  );
  return rows[0];
};

const getDeletionLogs = async () => {
  const { rows } = await db.query(
    'SELECT * FROM deleted_users_log ORDER BY deleted_at DESC'
  );
  return rows;
};

// ---- Specie ---- //
const logSpecieDeletion = async ({
  deletedSpecieId,
  deletedSpecieName,
  deletedById,
  deletedByName,
  deletedByRole,
}) => {
  await db.query(
    `INSERT INTO deleted_species_log
       (deleted_specie_id, deleted_specie_name, deleted_by_id, deleted_by_name, deleted_by_role)
     VALUES ($1, $2, $3, $4, $5)`,
    [deletedSpecieId, deletedSpecieName, deletedById, deletedByName, deletedByRole]
  );
};
 
const getSpecieDeletionLogs = async ({ limit, offset }) => {
  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `SELECT id, deleted_specie_id, deleted_specie_name,
              deleted_by_id, deleted_by_name, deleted_by_role, deleted_at
       FROM deleted_species_log
       ORDER BY deleted_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM deleted_species_log'),
  ]);
 
  return { items: itemsResult.rows, total: countResult.rows[0].total };
};

module.exports = { logUserDeletion, getDeletionLogs, logSpecieDeletion, getSpecieDeletionLogs };