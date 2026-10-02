const { ValidationError } = require('../utils/errors');
const { cleanText } = require('../utils/sanitize');
const { isValidProfilePicture } = require('./userDTO');
const { resolvePetPermissions } = require('../utils/petPermissions');

const PET_NAME_MIN_LENGTH = 2;
const PET_NAME_MAX_LENGTH = 100;
const PET_NAME_REGEX = /^[\p{L}\p{M}\p{N} .'’-]+$/u;
const MIN_BIRTH_YEAR = 1900;
const MAX_PG_INT = 2147483647;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const pad = (n, size = 2) => String(n).padStart(size, '0');

const validateSpecieId = (specieId) => {
  if (!Number.isSafeInteger(specieId) || specieId < 1 || specieId > MAX_PG_INT) {
    throw new ValidationError('The specie_id field must be a valid positive integer.');
  }
  return specieId;
};

const validatePetName = (name) => {
  if (typeof name !== 'string') {
    throw new ValidationError('The name field must be a string.');
  }

  const cleanPetName = cleanText(name);

  if (
    cleanPetName.length < PET_NAME_MIN_LENGTH ||
    cleanPetName.length > PET_NAME_MAX_LENGTH ||
    !PET_NAME_REGEX.test(cleanPetName)
  ) {
    throw new ValidationError(
      `Pet name must be ${PET_NAME_MIN_LENGTH} to ${PET_NAME_MAX_LENGTH} characters long and contain only letters, numbers, spaces, dots, apostrophes and hyphens.`
    );
  }

  return cleanPetName;
};

const validatePetPicture = (value) => {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value !== 'string') {
    throw new ValidationError('The pet_picture field must be a string.');
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!isValidProfilePicture(trimmed)) {
    throw new ValidationError('Invalid pet picture URL. Only public HTTPS links are allowed.');
  }

  return trimmed;
};

const validateBirthday = (birthday) => {
  if (birthday === undefined || birthday === null || birthday === '') return null;

  const formatError = new ValidationError(
    'Birthday must be a valid date (YYYY-MM-DD) or just a year (YYYY).'
  );

  if (typeof birthday !== 'string') throw formatError;

  const value = birthday.trim();
  let year;
  let month = 1;
  let day = 1;

  let match = /^(\d{4})$/.exec(value);
  if (match) {
    year = Number(match[1]);
  } else {
    match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw formatError;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }

  if (year < MIN_BIRTH_YEAR) throw formatError;

  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!exists) throw formatError;

  if (date.getTime() > Date.now() + ONE_DAY_MS) {
    throw new ValidationError('Birthday cannot be in the future.');
  }

  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
};

const parsePetId = (id) => {
  if (typeof id !== 'string' || !/^\d{1,9}$/.test(id) || Number(id) < 1) {
    throw new ValidationError('Invalid pet id.');
  }
  return Number(id);
};

const validateCreatePetDTO = (body) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const { specie_id, name, pet_picture, birthday } = body;

  return {
    specie_id: validateSpecieId(specie_id),
    name: validatePetName(name),
    pet_picture: validatePetPicture(pet_picture),
    birthday: validateBirthday(birthday),
  };
};

const validateUpdatePetDTO = (body) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const { specie_id, name, pet_picture, birthday } = body;
  const updates = {};

  if (specie_id !== undefined) updates.specie_id = validateSpecieId(specie_id);
  if (name !== undefined) updates.name = validatePetName(name);
  if (pet_picture !== undefined) updates.pet_picture = validatePetPicture(pet_picture);
  if (birthday !== undefined) updates.birthday = validateBirthday(birthday);

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update.');
  }

  return updates;
};

const toISO = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return null;
};

const toPetResponseDTO = (pet, viewer = null) => {
  if (!isPlainObject(pet)) return null;

  const dto = {
    id: pet.id,
    specieId: pet.specie_id,
    specieName: pet.specie_name ?? null,
    name: pet.name,
    petPicture: pet.pet_picture ?? null,
    birthday: toDateOnly(pet.birthday),
    createdAt: toISO(pet.created_at),
    deletedAt: toISO(pet.deleted_at),
  };

  if (viewer) {
    const permissions = resolvePetPermissions(pet, viewer);

    dto.isOwner = permissions.isOwner;
    dto.permissions = {
      canView: permissions.canView,
      canCreate: permissions.canCreate,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
    };

    if (!permissions.isOwner) {
      dto.ownerUsername = pet.created_by_username ?? null;
    }

    if (permissions.isAdmin) {
      dto.createdBy = pet.created_by ?? null;
      dto.createdByUsername = pet.created_by_username ?? null;
      dto.deletedBy = pet.deleted_by ?? null;
      dto.deletedByUsername = pet.deleted_by_username ?? null;
    }
  }

  return dto;
};

module.exports = {
  validateCreatePetDTO,
  validateUpdatePetDTO,
  parsePetId,
  toPetResponseDTO,
};