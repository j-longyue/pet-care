const { ValidationError } = require('../utils/errors');
const { cleanText } = require('../utils/sanitize');

const SPECIE_MIN_LENGTH = 2;
const SPECIE_MAX_LENGTH = 100;

const SPECIE_REGEX = /^[\p{L}\p{M}\p{N} .'’-]+$/u;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateCreateSpecieDTO = (body) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const { specie } = body;

  if (typeof specie !== 'string') {
    throw new ValidationError('The specie field must be a string.');
  }

  const cleanSpecie = cleanText(specie);

  if (!cleanSpecie) {
    throw new ValidationError('The specie field is mandatory.');
  }

  if (
    cleanSpecie.length < SPECIE_MIN_LENGTH ||
    cleanSpecie.length > SPECIE_MAX_LENGTH ||
    !SPECIE_REGEX.test(cleanSpecie)
  ) {
    throw new ValidationError(
      `Specie must be ${SPECIE_MIN_LENGTH} to ${SPECIE_MAX_LENGTH} characters long and contain only letters, numbers, spaces, dots, apostrophes and hyphens.`
    );
  }

  return { specie: cleanSpecie };
};

const parseSpecieId = (id) => {
  if (typeof id !== 'string' || !/^\d{1,9}$/.test(id) || Number(id) < 1) {
    throw new ValidationError('Invalid specie id.');
  }
  return Number(id);
};

const toSpecieResponseDTO = (specie) => {
  if (!specie || typeof specie !== 'object') return null;

  const createdAt = specie.created_at ? new Date(specie.created_at) : null;

  return {
    id: specie.id,
    specie: specie.specie,
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : null,
  };
};

module.exports = {
  validateCreateSpecieDTO,
  parseSpecieId,
  toSpecieResponseDTO,
  SPECIE_MIN_LENGTH,
  SPECIE_MAX_LENGTH,
};