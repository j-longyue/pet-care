const { ValidationError } = require('../utils/errors');
const { isValidUsername } = require('./userDTO');

const PERMISSION_KEYS = ['can_view', 'can_create', 'can_edit', 'can_delete'];

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readFlag = (key, value, defaultValue) => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw new ValidationError(`The ${key} field must be true or false.`);
  }
  return value;
};

const assertPermissionConsistency = (permissions) => {
  if (!permissions.can_view && (permissions.can_create || permissions.can_edit || permissions.can_delete)) {
    throw new ValidationError('can_view must be true when can_create, can_edit or can_delete is granted.');
  }
};

const validateGrantAccessDTO = (body) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const { username, can_view, can_create, can_edit, can_delete } = body;

  if (typeof username !== 'string' || !isValidUsername(username.trim())) {
    throw new ValidationError('A valid username is required.');
  }

  const permissions = {
    can_view: readFlag('can_view', can_view, true),
    can_create: readFlag('can_create', can_create, false),
    can_edit: readFlag('can_edit', can_edit, false),
    can_delete: readFlag('can_delete', can_delete, false),
  };

  assertPermissionConsistency(permissions);

  return { username: username.trim(), permissions };
};

const validateUpdateAccessDTO = (body) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const updates = {};
  for (const key of PERMISSION_KEYS) {
    if (body[key] !== undefined) {
      updates[key] = readFlag(key, body[key], undefined);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update.');
  }

  return updates;
};

const parseUserId = (id) => {
  if (typeof id !== 'string' || !/^\d{1,9}$/.test(id) || Number(id) < 1) {
    throw new ValidationError('Invalid user id.');
  }
  return Number(id);
};

const toISO = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toAccessResponseDTO = (row) => {
  if (!row || typeof row !== 'object') return null;

  return {
    userId: row.user_id,
    username: row.username,
    permissions: {
      canView: row.can_view,
      canCreate: row.can_create,
      canEdit: row.can_edit,
      canDelete: row.can_delete,
    },
    grantedBy: row.granted_by ?? null,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
};

module.exports = {
  PERMISSION_KEYS,
  validateGrantAccessDTO,
  validateUpdateAccessDTO,
  assertPermissionConsistency,
  parseUserId,
  toAccessResponseDTO,
};