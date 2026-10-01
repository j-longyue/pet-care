const petRepository = require('../repositories/petRepository');
const specieRepository = require('../repositories/specieRepository');
const {
  validateCreatePetDTO,
  validateUpdatePetDTO,
  parsePetId,
  toPetResponseDTO,
} = require('../dtos/petDTO');
const { parsePagination, parseSort, buildPaginatedResponse } = require('../utils/forPages');
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

const isOwnerOf = (pet, user) => Number(pet.created_by) === Number(user.id);

const assertSpecieExists = async (specieId) => {
  const specie = await specieRepository.findById(specieId);
  if (!specie) {
    throw new ValidationError('Specie not found.');
  }
};

const findVisiblePetOrThrow = async (id, user) => {
  const pet = await petRepository.findById(parsePetId(id));

  const visible = pet && (isAdminUser(user) || (isOwnerOf(pet, user) && !pet.deleted_at));
  if (!visible) {
    throw new NotFoundError('Pet not found.');
  }

  return pet;
};

const createPet = async (body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const data = validateCreatePetDTO(body);
  await assertSpecieExists(data.specie_id);

  try {
    const pet = await petRepository.create(data, Number(requestingUser.id));
    return toPetResponseDTO(pet, { isAdmin: isAdminUser(requestingUser) });
  } catch (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION && String(error.constraint).includes('specie')) {
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
    items.map((pet) => toPetResponseDTO(pet, { isAdmin })),
    total,
    pagination
  );
};

const getPetById = async (id, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await findVisiblePetOrThrow(id, requestingUser);
  return toPetResponseDTO(pet, { isAdmin: isAdminUser(requestingUser) });
};

const updatePet = async (id, body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await findVisiblePetOrThrow(id, requestingUser);

  if (pet.deleted_at) {
    throw new NotFoundError('Pet not found.');
  }

  if (!isOwnerOf(pet, requestingUser)) {
    throw new ForbiddenError('You can only update your own pets.');
  }

  const data = validateUpdatePetDTO(body);

  if (data.specie_id !== undefined) {
    await assertSpecieExists(data.specie_id);
  }

  let updatedPet;
  try {
    updatedPet = await petRepository.update(pet.id, data);
  } catch (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION && String(error.constraint).includes('specie')) {
      throw new ValidationError('Specie not found.');
    }
    throw error;
  }

  if (!updatedPet) {
    throw new NotFoundError('Pet not found.');
  }

  return toPetResponseDTO(updatedPet, { isAdmin: isAdminUser(requestingUser) });
};

const deletePet = async (id, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await findVisiblePetOrThrow(id, requestingUser);

  if (pet.deleted_at) {
    throw new NotFoundError('Pet not found.');
  }

  if (!isOwnerOf(pet, requestingUser)) {
    throw new ForbiddenError('You can only delete your own pets.');
  }

  const deletedPet = await petRepository.softDelete(pet.id, Number(requestingUser.id));
  if (!deletedPet) {
    throw new NotFoundError('Pet not found.');
  }

  return toPetResponseDTO(deletedPet, { isAdmin: isAdminUser(requestingUser) });
};

module.exports = {
  createPet,
  getAllPets,
  getPetById,
  updatePet,
  deletePet,
};