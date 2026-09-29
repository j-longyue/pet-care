const db = require('../config/db');

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

module.exports = { logUserDeletion, getDeletionLogs };