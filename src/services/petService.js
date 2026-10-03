const petRepository = require('../repositories/petRepository');
const specieRepository = require('../repositories/specieRepository');
const {
  validateCreatePetDTO,
  validateUpdatePetDTO,
  parsePetId,
  toPetResponseDTO,
} = require('../dtos/petDTO');
const { resolvePetPermissions } = require('../utils/petPermissions');
const { parsePagination, parseSort, buildPaginatedResponse } = require('../utils/forPages');
const { assertLimitAllowed, assertPetWritable, isPetWithinQuota } = require('./planLimitService');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');

const PG_FOREIGN_KEY_VIOLATION = '23503';

const assertAuthenticated = (user) => {
  if (!user) throw new UnauthorizedError();
};

const isAdminUser = (user) => user.role === 'adm';

const toResponse = (pet, user) => ({
  ...toPetResponseDTO(pet, user),
  read_only: !isPetWithinQuota(pet),
});

const assertSpecieExists = async (specieId) => {
  const specie = await specieRepository.findById(specieId);
  if (!specie) {
    throw new ValidationError('Specie not found.');
  }
};

const isSpecieForeignKeyError = (error) =>
  error.code === PG_FOREIGN_KEY_VIOLATION && String(error.constraint).includes('specie');

const findVisiblePetOrThrow = async (id, user) => {
  const pet = await petRepository.findById(parsePetId(id), Number(user.id));
  if (!pet) {
    throw new NotFoundError('Pet not found.');
  }

  const permissions = resolvePetPermissions(pet, user);
  if (!permissions.canView) {
    throw new NotFoundError('Pet not found.');
  }

  return { pet, permissions };
};

const createPet = async (body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const data = validateCreatePetDTO(body);
  await assertSpecieExists(data.specie_id);

  try {
    const outcome = await petRepository.createWithLimit(data, Number(requestingUser.id));

    if (outcome.notFound) throw new UnauthorizedError();
    assertLimitAllowed(outcome);

    return toResponse(outcome.pet, requestingUser);
  } catch (error) {
    if (isSpecieForeignKeyError(error)) {
      throw new ValidationError('Specie not found.');
    }
    throw error;
  }
};

const getAllPets = async (query = {}, requestingUser) => {
  assertAuthenticated(requestingUser);

  const isAdmin = isAdminUser(requestingUser);
  const includeDeleted = query.include_deleted === 'true';

  if (includeDeleted && !isAdmin) {
    throw new ForbiddenError('Only administrators can view deleted pets.');
  }

  const pagination = parsePagination(query);
  const sort = parseSort(query, petRepository.SORTABLE_FIELDS, 'created_at', 'DESC');

  const { items, total } = await petRepository.findAll({
    ...pagination,
    sort,
    userId: Number(requestingUser.id),
    isAdmin,
    includeDeleted,
  });

  return buildPaginatedResponse(
    items.map((pet) => toResponse(pet, requestingUser)),
    total,
    pagination
  );
};

const getPetById = async (id, requestingUser) => {
  assertAuthenticated(requestingUser);

  const { pet } = await findVisiblePetOrThrow(id, requestingUser);
  return toResponse(pet, requestingUser);
};

const updatePet = async (id, body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const { pet, permissions } = await findVisiblePetOrThrow(id, requestingUser);

  if (pet.deleted_at) {
    throw new NotFoundError('Pet not found.');
  }

  if (!permissions.isOwner) {
    throw new ForbiddenError('You can only update your own pets.');
  }

  assertPetWritable(pet);

  const data = validateUpdatePetDTO(body);

  if (data.specie_id !== undefined) {
    await assertSpecieExists(data.specie_id);
  }

  let updatedPet;
  try {
    updatedPet = await petRepository.update(pet.id, data, Number(requestingUser.id));
  } catch (error) {
    if (isSpecieForeignKeyError(error)) {
      throw new ValidationError('Specie not found.');
    }
    throw error;
  }

  if (!updatedPet) {
    throw new NotFoundError('Pet not found.');
  }

  return toResponse(updatedPet, requestingUser);
};

const deletePet = async (id, requestingUser) => {
  assertAuthenticated(requestingUser);

  const { pet, permissions } = await findVisiblePetOrThrow(id, requestingUser);

  if (pet.deleted_at) {
    throw new NotFoundError('Pet not found.');
  }

  if (!permissions.isOwner) {
    throw new ForbiddenError('You can only delete your own pets.');
  }

  const deletedPet = await petRepository.softDelete(pet.id, Number(requestingUser.id));
  if (!deletedPet) {
    throw new NotFoundError('Pet not found.');
  }

  return toResponse(deletedPet, requestingUser);
};

module.exports = {
  createPet,
  getAllPets,
  getPetById,
  updatePet,
  deletePet,
};