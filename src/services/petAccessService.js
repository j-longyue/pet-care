const petRepository = require('../repositories/petRepository');
const petAccessRepository = require('../repositories/petAccessRepository');
const userRepository = require('../repositories/userRepository');
const { parsePetId } = require('../dtos/petDTO');
const {
  validateGrantAccessDTO,
  validateUpdateAccessDTO,
  assertPermissionConsistency,
  parseUserId,
  toAccessResponseDTO,
} = require('../dtos/petAccessDTO');
const { resolvePetPermissions } = require('../utils/petPermissions');
const { PLAN_LIMITS } = require('../config/plans');
const { parsePagination, buildPaginatedResponse } = require('../utils/forPages');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');

const PG_UNIQUE_VIOLATION = '23505';
const DEFAULT_PLAN = 'free';

const getMaxPetAccess = (plan) => {
  const planName =
    typeof plan === 'string' && Object.hasOwn(PLAN_LIMITS, plan) ? plan : DEFAULT_PLAN;
  const max = PLAN_LIMITS[planName]?.maxPetAccess;

  const isValid = max === Infinity || (Number.isInteger(max) && max >= 0);
  if (!isValid) {
    throw new Error(`PLAN_LIMITS has no valid maxPetAccess for plan "${planName}"`);
  }

  return max;
};

const getOwnerMaxPetAccess = async (user) => {
  const owner = await userRepository.findById(Number(user.id));
  if (!owner) throw new UnauthorizedError();
  return getMaxPetAccess(owner.plan);
};

const limitReachedMessage = (maxAccess) =>
  maxAccess === 0
    ? 'Your plan does not allow sharing pets. Upgrade your plan to share.'
    : `Your plan allows up to ${maxAccess} ${maxAccess === 1 ? 'person' : 'people'} with access per pet. Remove someone or upgrade your plan to add more.`;

const assertAuthenticated = (user) => {
  if (!user) throw new UnauthorizedError();
};

const loadPetWithPermissions = async (petId, user) => {
  const pet = await petRepository.findById(parsePetId(String(petId)), Number(user.id));
  if (!pet) throw new NotFoundError('Pet not found.');

  const permissions = resolvePetPermissions(pet, user);
  if (!permissions.canView || pet.deleted_at) throw new NotFoundError('Pet not found.');

  return { pet, permissions };
};

const loadPetAsOwner = async (petId, user) => {
  const { pet, permissions } = await loadPetWithPermissions(petId, user);
  if (!permissions.isOwner) {
    throw new ForbiddenError('Only the pet owner can manage access.');
  }
  return pet;
};

const PERMISSION_BY_ACTION = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
};

const assertPetPermission = async (petId, user, action) => {
  assertAuthenticated(user);

  const key = PERMISSION_BY_ACTION[action];
  if (!key) throw new Error(`Unknown pet action: ${action}`);

  const pet = await petRepository.findById(parsePetId(String(petId)), Number(user.id));
  if (!pet) throw new NotFoundError('Pet not found.');

  const permissions = resolvePetPermissions(pet, user);
  if (!permissions.canView) throw new NotFoundError('Pet not found.');

  if (!permissions[key]) {
    throw new ForbiddenError(`You do not have permission to ${action} records of this pet.`);
  }

  return { pet, permissions };
};

const grantAccess = async (petId, body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await loadPetAsOwner(petId, requestingUser);
  const { username, permissions } = validateGrantAccessDTO(body);

  const target = await userRepository.findByEmailOrUsername(null, username);
  if (!target) {
    throw new NotFoundError('User not found.');
  }

  if (Number(target.id) === Number(requestingUser.id)) {
    throw new ValidationError('You cannot grant access to yourself.');
  }

  const existing = await petAccessRepository.findByPetAndUser(pet.id, target.id);
  if (existing) {
    throw new ConflictError('This user already has access to this pet.');
  }

  const maxAccess = await getOwnerMaxPetAccess(requestingUser);

  try {
    const { access, limitReached } = await petAccessRepository.createWithLimit({
      petId: pet.id,
      userId: target.id,
      permissions,
      grantedBy: Number(requestingUser.id),
      maxAccess,
    });

    if (limitReached) {
      throw new ForbiddenError(limitReachedMessage(maxAccess));
    }

    return toAccessResponseDTO(access);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new ConflictError('This user already has access to this pet.');
    }
    throw error;
  }
};

const listAccess = async (petId, query = {}, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await loadPetAsOwner(petId, requestingUser);
  const pagination = parsePagination(query);

  const { items, total } = await petAccessRepository.findAllByPet({ petId: pet.id, ...pagination });
  const maxAccess = await getOwnerMaxPetAccess(requestingUser);

  return {
    ...buildPaginatedResponse(items.map(toAccessResponseDTO), total, pagination),
    limits: { used: total, max: Number.isFinite(maxAccess) ? maxAccess : null },
  };
};

const updateAccess = async (petId, userId, body, requestingUser) => {
  assertAuthenticated(requestingUser);

  const pet = await loadPetAsOwner(petId, requestingUser);
  const targetUserId = parseUserId(String(userId));
  const updates = validateUpdateAccessDTO(body);

  const current = await petAccessRepository.findByPetAndUser(pet.id, targetUserId);
  if (!current) {
    throw new NotFoundError('Access not found.');
  }

  assertPermissionConsistency({
    can_view: current.can_view,
    can_create: current.can_create,
    can_edit: current.can_edit,
    can_delete: current.can_delete,
    ...updates,
  });

  const updated = await petAccessRepository.updatePermissions(pet.id, targetUserId, updates);
  if (!updated) {
    throw new NotFoundError('Access not found.');
  }

  return toAccessResponseDTO(updated);
};

const revokeAccess = async (petId, userId, requestingUser) => {
  assertAuthenticated(requestingUser);

  const id = parsePetId(String(petId));
  const targetUserId = parseUserId(String(userId));

  if (targetUserId !== Number(requestingUser.id)) {
    await loadPetAsOwner(id, requestingUser);
  }

  const removed = await petAccessRepository.remove(id, targetUserId);
  if (!removed) {
    throw new NotFoundError('Access not found.');
  }
};

module.exports = {
  assertPetPermission,
  grantAccess,
  listAccess,
  updateAccess,
  revokeAccess,
};