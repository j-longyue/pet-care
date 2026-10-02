const db = require('../config/db');

const SORT_COLUMNS = {
  id: 'p.id',
  name: 'p.name',
  birthday: 'p.birthday',
  created_at: 'p.created_at',
};
const SORTABLE_FIELDS = Object.keys(SORT_COLUMNS);

const UPDATABLE_COLUMNS = ['specie_id', 'name', 'pet_picture', 'birthday'];

const ACCESS_JOIN = 'LEFT JOIN pet_access a ON a.pet_id = p.id AND a.user_id = $1';

const BASE_SELECT = `
  SELECT p.*, s.specie AS specie_name,
         creator.username AS created_by_username,
         deleter.username AS deleted_by_username,
         a.can_view AS access_can_view,
         a.can_create AS access_can_create,
         a.can_edit AS access_can_edit,
         a.can_delete AS access_can_delete
  FROM pets p
  LEFT JOIN species s ON p.specie_id = s.id
  LEFT JOIN users creator ON p.created_by = creator.id
  LEFT JOIN users deleter ON p.deleted_by = deleter.id
  ${ACCESS_JOIN}
`;

const findById = async (id, viewerId = null) => {
  const { rows } = await db.query(`${BASE_SELECT} WHERE p.id = $2`, [viewerId ?? null, id]);
  return rows[0];
};

const create = async (data, userId) => {
  const { rows } = await db.query(
    `INSERT INTO pets (specie_id, name, pet_picture, birthday, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.specie_id, data.name, data.pet_picture, data.birthday, userId]
  );
  return findById(rows[0].id, userId);
};

const findAll = async ({ userId, isAdmin = false, includeDeleted = false, limit, offset, sort }) => {
  const conditions = [];
  const params = [userId];

  if (!isAdmin) {
    conditions.push('(p.created_by = $1 OR a.can_view IS TRUE)');
  }

  if (!includeDeleted) {
    conditions.push('p.deleted_at IS NULL');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderColumn = Object.hasOwn(SORT_COLUMNS, sort?.field)
    ? SORT_COLUMNS[sort.field]
    : SORT_COLUMNS.created_at;
  const direction = sort?.direction === 'ASC' ? 'ASC' : 'DESC';

  const i = params.length + 1;

  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `${BASE_SELECT} ${where}
       ORDER BY ${orderColumn} ${direction}, p.id ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*)::int AS total FROM pets p ${ACCESS_JOIN} ${where}`, params),
  ]);

  return { items: itemsResult.rows, total: countResult.rows[0].total };
};

const update = async (id, data, viewerId = null) => {
  const entries = Object.entries(data).filter(([key]) => UPDATABLE_COLUMNS.includes(key));
  if (entries.length === 0) return undefined;

  const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);

  const { rows } = await db.query(
    `UPDATE pets SET ${setClause}
     WHERE id = $${values.length + 1} AND deleted_at IS NULL
     RETURNING id`,
    [...values, id]
  );

  return rows[0] ? findById(rows[0].id, viewerId) : undefined;
};

const softDelete = async (id, userId) => {
  const { rows } = await db.query(
    `UPDATE pets
     SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [userId, id]
  );

  return rows[0] ? findById(rows[0].id, userId) : undefined;
};

module.exports = {
  SORTABLE_FIELDS,
  create,
  findById,
  findAll,
  update,
  softDelete,
};