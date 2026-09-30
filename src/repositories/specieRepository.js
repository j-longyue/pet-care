const db = require('../config/db');
const Specie = require('../models/Specie');

const SORTABLE_FIELDS = ['id', 'specie', 'created_at'];

const COLUMNS = 'id, specie, created_by, created_at, deleted_at, deleted_by';

const toModel = (row) => (row ? new Specie(row) : undefined);

const create = async ({ specie, createdBy }) => {
  const { rows } = await db.query(
    `INSERT INTO species (specie, created_by) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [specie, createdBy]
  );
  return toModel(rows[0]);
};

const findAll = async ({ limit, offset, sort }) => {
  const field = SORTABLE_FIELDS.includes(sort?.field) ? sort.field : 'specie';
  const direction = sort?.direction === 'DESC' ? 'DESC' : 'ASC';

  const [itemsResult, countResult] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS}
       FROM species
       WHERE deleted_at IS NULL
       ORDER BY ${field} ${direction}, id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM species WHERE deleted_at IS NULL'),
  ]);

  return { items: itemsResult.rows.map(toModel), total: countResult.rows[0].total };
};

const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM species WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return toModel(rows[0]);
};

const findBySpecie = async (specie) => {
  const { rows } = await db.query(
    `SELECT ${COLUMNS} FROM species WHERE LOWER(specie) = LOWER($1) AND deleted_at IS NULL`,
    [specie]
  );
  return toModel(rows[0]);
};

const softDelete = async (id, deletedBy) => {
  const { rows } = await db.query(
    `UPDATE species
     SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, specie`,
    [id, deletedBy]
  );
  return rows[0];
};

module.exports = {
  SORTABLE_FIELDS,
  create,
  findAll,
  findById,
  findBySpecie,
  softDelete,
};