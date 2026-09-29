const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 20;

const stripTags = (str) => str.replace(/<[^>]*>/g, '').trim();

const isValidPassword = (password) => {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
};

const isValidUsername = (username) => {
  return typeof username === 'string' && USERNAME_REGEX.test(username);
};

const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
};

const isValidProfilePicture = (url) => {
  if (!url) return true;
  return typeof url === 'string' && /^https:\/\/.+/.test(url);
};

const validateCreateUserDTO = (body, requestingUser) => {
  const { name, username, email, password, role, profile_picture } = body;

  if (
    typeof name !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new Error('The name, username, email, and password fields must be strings.');
  }

  if (!name.trim() || !username.trim() || !email.trim() || !password) {
    throw new Error('The name, username, email, and password fields are mandatory.');
  }

  if (!isValidUsername(username)) {
    throw new Error('Username must be 3 to 30 characters long and contain only letters, numbers, dots and underscores.');
  }

  if (!isValidEmail(email)) {
    throw new Error('Invalid e-mail format.');
  }

  if (!isValidPassword(password)) {
    throw new Error(`Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long.`);
  }

  if (!isValidProfilePicture(profile_picture)) {
    throw new Error('Invalid profile picture URL. Only HTTPS links are allowed.');
  }

  let finalRole = 'common';

  if (role === 'adm') {
    const isAdmin = requestingUser && requestingUser.role === 'adm';
    if (!isAdmin) {
      throw new Error('Only an authenticated admin can create an admin account.');
    }
    finalRole = 'adm';
  } else if (role === 'mod') {
    const isAdmin = requestingUser && requestingUser.role === 'adm';
    if (!isAdmin) {
      throw new Error('Only an authenticated admin can create a moderator account.');
    }
    finalRole = 'mod';
  }

  return {
    name: stripTags(name),
    username: stripTags(username),
    email: email.trim().toLowerCase(),
    password,
    role: finalRole,
    profile_picture: profile_picture ? profile_picture.trim() : null,
  };
};

const toUserResponseDTO = (user) => {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    profile_picture: user.profile_picture,
    createdAt: user.created_at || user.createdAt,
    plan: user.plan
  };
};

module.exports = {
  validateCreateUserDTO,
  toUserResponseDTO,
  stripTags,
  isValidPassword,
  isValidUsername,
  isValidEmail,
  isValidProfilePicture,
  USERNAME_REGEX,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
};