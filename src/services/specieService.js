const specieRepository = require('../repositories/specieRepository');
const auditRepository = require('../repositories/auditRepository');
const {
  validateCreateSpecieDTO,
  parseSpecieId,
  toSpecieResponseDTO,
} = require('../dtos/specieDTO');
const { parsePagination, parseSort, buildPaginatedResponse } = require('../utils/forPages');
const {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');

const PG_UNIQUE_VIOLATION = '23505';

const assertAuthenticated = (requestingUser) => {
  if (!requestingUser) throw new UnauthorizedError();
};

const assertAdmin = (requestingUser) => {
  assertAuthenticated(requestingUser);
  if (requestingUser.role !== 'adm') {
    throw new ForbiddenError('Access denied. Admins only.');
  }
};

const createSpecie = async (rawData, requestingUser) => {
  assertAdmin(requestingUser);

  const { specie } = validateCreateSpecieDTO(rawData);

  const existing = await specieRepository.findBySpecie(specie);
  if (existing) {
    throw new ConflictError('Specie already exists.');
  }

  try {
    const created = await specieRepository.create({
      specie,
      createdBy: Number(requestingUser.id),
    });
    return toSpecieResponseDTO(created);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new ConflictError('Specie already exists.');
    }
    throw error;
  }
};

const getAllSpecies = async (requestingUser, query = {}) => {
  assertAuthenticated(requestingUser);

  const pagination = parsePagination(query);
  const sort = parseSort(query, specieRepository.SORTABLE_FIELDS, 'specie', 'ASC');

  const { items, total } = await specieRepository.findAll({ ...pagination, sort });

  return buildPaginatedResponse(items.map(toSpecieResponseDTO), total, pagination);
};

const getSpecieById = async (id, requestingUser) => {
  assertAuthenticated(requestingUser);

  const specie = await specieRepository.findById(parseSpecieId(id));
  if (!specie) {
    throw new NotFoundError('Specie not found.');
  }

  return toSpecieResponseDTO(specie);
};

const deleteSpecie = async (id, requestingUser) => {
  assertAdmin(requestingUser);

  const specieId = parseSpecieId(id);

  const deleted = await specieRepository.softDelete(specieId, Number(requestingUser.id));
  if (!deleted) {
    throw new NotFoundError('Specie not found.');
  }

  try {
    await auditRepository.logSpecieDeletion({
      deletedSpecieId: deleted.id,
      deletedSpecieName: deleted.specie,
      deletedById: requestingUser.id,
      deletedByName: requestingUser.name || 'Unknown',
      deletedByRole: requestingUser.role,
    });
  } catch (auditError) {
    console.error(`Failed to write audit log for deleted specie ${deleted.id}:`, auditError.message);
  }

  return { message: 'Specie deleted successfully' };
};

const getDeletedSpeciesLog = async (requestingUser, query = {}) => {
  assertAdmin(requestingUser);

  const pagination = parsePagination(query);
  const { items, total } = await auditRepository.getSpecieDeletionLogs(pagination);

  return buildPaginatedResponse(items, total, pagination);
};

module.exports = {
  createSpecie,
  getAllSpecies,
  getSpecieById,
  deleteSpecie,
  getDeletedSpeciesLog,
};