const db = require('../config/db');

const create = async ({ name, username, email, password, role, profile_picture }) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, username, email, password, role, profile_picture) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [name, username, email, password, role || 'common', profile_picture]
  );
  return rows[0];
};

const SORTABLE_FIELDS = ['id', 'name', 'username', 'email', 'role', 'plan', 'created_at'];

const findAll = async ({ limit, offset, sort }) => {
  const field = SORTABLE_FIELDS.includes(sort?.field) ? sort.field : 'id';
  const direction = sort?.direction === 'DESC' ? 'DESC' : 'ASC';

  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `SELECT id, name, username, email, role, plan, profile_picture, created_at
       FROM users
       ORDER BY ${field} ${direction}, id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM users'),
  ]);

  return { items: itemsResult.rows, total: countResult.rows[0].total };
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};

const findByEmailOrUsername = async (email, username) => {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );
  return rows[0];
};

const update = async (id, { name, username, email, password, role, profile_picture }) => {
  const { rows } = await db.query(
    `UPDATE users
     SET name = $1, username = $2, email = $3, password = $4, role = $5, profile_picture = $6
     WHERE id = $7
     RETURNING *`,
    [name, username, email, password, role, profile_picture, id]
  );
  return rows[0];
};

const remove = async (id) => {
  const { rows } = await db.query(
    'DELETE FROM users WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0]; 
};

// ---- RESET PASSWORD ---- //

const setResetToken = async (userId, tokenHash, expiresAt) => {
  const { rows } = await db.query(
    `UPDATE users
     SET reset_password_token = $1, reset_password_expires = $2
     WHERE id = $3
     RETURNING id`,
    [tokenHash, expiresAt, userId]
  );
  return rows[0];
};

const findByResetToken = async (tokenHash) => {
  const { rows } = await db.query(
    `SELECT * FROM users
     WHERE reset_password_token = $1
       AND reset_password_expires > NOW()`,
    [tokenHash]
  );
  return rows[0];
};

const updatePasswordAndClearToken = async (userId, hashedPassword) => {
  const { rows } = await db.query(
    `UPDATE users
     SET password = $1, reset_password_token = NULL, reset_password_expires = NULL
     WHERE id = $2
     RETURNING *`,
    [hashedPassword, userId]
  );
  return rows[0];
};

// ---- PLAN ---- //

const updatePlan = async (id, plan) => {
  const { rows } = await db.query(
    `UPDATE users SET plan = $1, plan_status = 'active', plan_expires_at = NULL
     RETURNING id, name, username, email, role, plan, profile_picture, created_at`,
    [plan, id]
  );
  return rows[0];
};

module.exports = {
  SORTABLE_FIELDS,
  findAll,
  findById,
  findByEmailOrUsername,
  create,
  update,
  remove,
  setResetToken,
  findByResetToken,
  updatePasswordAndClearToken,
  updatePlan
};