const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const {
  validateCreateUserDTO,
  toUserResponseDTO,
  stripTags,
  isValidPassword,
  isValidUsername,
  isValidEmail,
  isValidProfilePicture,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} = require('../dtos/userDTO');
const { sendWelcomeEmail } = require('../utils/mailer');
const { parsePagination, parseSort, buildPaginatedResponse } = require('../utils/forPages');

const VALID_ROLES = ['adm', 'mod', 'common'];
const VALID_PLANS = ['free', 'premium', 'vip'];

const createUser = async (rawData, requestingUser) => {
  const validatedData = validateCreateUserDTO(rawData, requestingUser);

  const existingUser = await userRepository.findByEmailOrUsername(
    validatedData.email,
    validatedData.username
  );

  if (existingUser) {
    throw new Error('Email or username already exists.');
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const newUser = await userRepository.create({
    ...validatedData,
    password: hashedPassword,
  });

  try {
    await sendWelcomeEmail(newUser.email, newUser.name);
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError.message);
  }

  return toUserResponseDTO(newUser);
};

const getAllUsers = async (requestingUser, query = {}) => {
  if (!requestingUser || requestingUser.role !== 'adm') {
    throw new Error('Access denied. Admins only.');
  }

  const pagination = parsePagination(query);
  const sort = parseSort(query, userRepository.SORTABLE_FIELDS, 'id', 'ASC');

  const { items, total } = await userRepository.findAll({ ...pagination, sort });

  return buildPaginatedResponse(items.map(toUserResponseDTO), total, pagination);
};

const getUserById = async (id, requestingUser) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  const isOwnAccount = Number(requestingUser.id) === Number(id);
  const isRequestorAdmin = requestingUser.role === 'adm';

  if (!isOwnAccount && !isRequestorAdmin) {
    throw new Error('You can only view your own account.');
  }

  return toUserResponseDTO(user);
};

const updateUser = async (id, rawData, requestingUser) => {
  if (!requestingUser) {
    throw new Error('Authentication required.');
  }

  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new Error('User not found');
  }

  const isOwnAccount = Number(requestingUser.id) === Number(id);
  const isRequestorAdmin = requestingUser.role === 'adm';

  if (!isOwnAccount && !isRequestorAdmin) {
    throw new Error('You can only update your own account.');
  }

  let newEmail = existingUser.email;
  if (typeof rawData.email === 'string' && rawData.email.trim()) {
    const normalizedEmail = rawData.email.trim().toLowerCase();

    if (normalizedEmail !== existingUser.email) {
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Invalid e-mail format.');
      }

      const emailInUse = await userRepository.findByEmailOrUsername(normalizedEmail, null);
      if (emailInUse) {
        throw new Error('E-mail is already in use by another account.');
      }
      newEmail = normalizedEmail;
    }
  }

  let newUsername = existingUser.username;
  if (rawData.username && rawData.username !== existingUser.username) {
    if (!isOwnAccount && !isRequestorAdmin) {
      throw new Error('You do not have permission to update this user\'s username.');
    }

    if (!isValidUsername(rawData.username)) {
      throw new Error('Username must be 3 to 30 characters long and contain only letters, numbers, dots and underscores.');
    }

    const usernameInUse = await userRepository.findByEmailOrUsername(null, rawData.username);
    if (usernameInUse) {
      throw new Error('Username is already in use by another account.');
    }
    newUsername = stripTags(rawData.username);
  }

  let newRole = existingUser.role;
  if (rawData.role && rawData.role !== existingUser.role) {
    if (!isRequestorAdmin) {
      throw new Error('Only an admin can change user roles.');
    }

    if (!VALID_ROLES.includes(rawData.role)) {
      throw new Error('Invalid role.');
    }

    if (existingUser.role === 'adm' && rawData.role === 'common') {
      throw new Error('An admin role cannot be changed back to common.');
    }

    newRole = rawData.role;
  }

  let newPlan = existingUser.plan;
  if (rawData.plan !== undefined && rawData.plan !== existingUser.plan) {
    if (!isRequestorAdmin) {
      throw new Error('Only an admin can change user plans.');
    }

    if (!VALID_PLANS.includes(rawData.plan)) {
      throw new Error(`Invalid plan. Valid options: ${VALID_PLANS.join(', ')}`);
    }

    newPlan = rawData.plan;
  }

  let newPassword = existingUser.password;
  if (rawData.password) {
    if (!isValidPassword(rawData.password)) {
      throw new Error(`Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long.`);
    }

    if (isOwnAccount) {
      if (!rawData.oldPassword) {
        throw new Error('Current password (oldPassword) is required to set a new password.');
      }

      const isOldPasswordCorrect = await bcrypt.compare(rawData.oldPassword, existingUser.password);
      if (!isOldPasswordCorrect) {
        throw new Error('Incorrect current password.');
      }
    }

    newPassword = await bcrypt.hash(rawData.password, 10);
  }

  if (rawData.profile_picture && !isValidProfilePicture(rawData.profile_picture)) {
    throw new Error('Invalid profile picture URL. Only HTTPS links are allowed.');
  }

  const updatedData = {
    name: isOwnAccount && rawData.name ? stripTags(rawData.name) : existingUser.name,
    username: newUsername,
    email: newEmail,
    password: newPassword,
    role: newRole,
    plan: newPlan,
    profile_picture: isOwnAccount
      ? (rawData.profile_picture ?? existingUser.profile_picture)
      : existingUser.profile_picture,
  };

  const updatedUser = await userRepository.update(id, updatedData);
  return toUserResponseDTO(updatedUser);
};

const deleteUser = async (id, requestingUser) => {
  if (!requestingUser) {
    throw new Error('Authentication required.');
  }

  const targetUser = await userRepository.findById(id);

  if (!targetUser) {
    throw new Error('User not found');
  }

  const isOwnAccount = Number(requestingUser.id) === Number(targetUser.id);
  const isAdm = requestingUser.role === 'adm';
  const isMod = requestingUser.role === 'mod';

  const recordAuditAndRemove = async () => {
    await auditRepository.logUserDeletion({
      deletedUserId: targetUser.id,
      deletedUserName: targetUser.name,
      deletedUserEmail: targetUser.email,
      deletedUserRole: targetUser.role,
      deletedById: requestingUser.id,
      deletedByName: requestingUser.name || 'Unknown',
      deletedByRole: requestingUser.role,
    });

    await userRepository.remove(id);
  };

  if (isOwnAccount) {
    await recordAuditAndRemove();
    return { message: 'User deleted successfully' };
  }

  if (isMod) {
    if (targetUser.role === 'common') {
      await recordAuditAndRemove();
      return { message: 'User deleted successfully' };
    }
    throw new Error('Moderators can only delete common users.');
  }

  if (isAdm) {
    if (targetUser.role === 'common' || targetUser.role === 'mod') {
      await recordAuditAndRemove();
      return { message: 'User deleted successfully' };
    }
    throw new Error('Admins cannot delete other admin accounts.');
  }

  throw new Error('You do not have permission to delete this user.');
};

// ---- PLAN TEMP ---- //

const updateUserPlan = async (id, rawData, requestingUser) => {
  if (!requestingUser || requestingUser.role !== 'adm') {
    throw new Error('Access denied. Admins only.');
  }

  const { plan } = rawData;
  if (!VALID_PLANS.includes(plan)) {
    throw new Error(`Invalid plan. Valid options: ${VALID_PLANS.join(', ')}`);
  }

  const targetUser = await userRepository.findById(id);
  if (!targetUser) {
    throw new Error('User not found');
  }

  const updatedUser = await userRepository.updatePlan(id, plan);
  return toUserResponseDTO(updatedUser);
};

const getDeletedUsersLog = async (requestingUser) => {
  if (!requestingUser || requestingUser.role !== 'adm') {
    throw new Error('Access denied. Admins only.');
  }

  return await auditRepository.getDeletionLogs();
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDeletedUsersLog,
  updateUserPlan,
};