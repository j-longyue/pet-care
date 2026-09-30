const validator = require('validator');
const { cleanText } = require('../utils/sanitize');

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const NAME_REGEX = /^[\p{L}\p{M}\p{N} .'’-]+$/u;
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/;

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const URL_MAX_LENGTH = 2048;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;
const BCRYPT_MAX_BYTES = 72;

const ALLOWED_ROLES = ['common', 'mod', 'adm'];
const PRIVILEGED_ROLES = ['mod', 'adm'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const stripTags = (str) =>
  cleanText(str)
    .replace(/<[^>]*>?/g, '')
    .replace(/[<>]/g, '')
    .trim();

const isValidPassword = (password) => {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return false;
  if (password.includes('\u0000')) return false;
  return Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES;
};

const isValidUsername = (username) =>
  typeof username === 'string' && USERNAME_REGEX.test(username);

const isValidEmail = (email) =>
  typeof email === 'string' &&
  email.length <= EMAIL_MAX_LENGTH &&
  !CONTROL_CHARS_REGEX.test(email) &&
  validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: true,
    allow_ip_domain: false,
  });

const isValidName = (name) =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= NAME_MAX_LENGTH &&
  NAME_REGEX.test(name);

const isValidProfilePicture = (url) => {
  if (url === undefined || url === null || url === '') return true;
  if (typeof url !== 'string' || url.length > URL_MAX_LENGTH) return false;
  if (CONTROL_CHARS_REGEX.test(url) || /\s/.test(url)) return false;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false; 
  if (!validator.isFQDN(parsed.hostname, { require_tld: true })) return false;
  return true;
};

const validateCreateUserDTO = (body, requestingUser) => {
  if (!isPlainObject(body)) {
    throw new ValidationError('Invalid request body.');
  }

  const { name, username, email, password, role, profile_picture } = body;

  if (
    typeof name !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new ValidationError('The name, username, email, and password fields must be strings.');
  }

  const cleanName = stripTags(name);
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || !cleanUsername || !cleanEmail || !password) {
    throw new ValidationError('The name, username, email, and password fields are mandatory.');
  }

  if (!isValidName(cleanName)) {
    throw new ValidationError(
      `Name must have up to ${NAME_MAX_LENGTH} characters and contain only letters, numbers, spaces, dots, apostrophes and hyphens.`
    );
  }

  if (!isValidUsername(cleanUsername)) {
    throw new ValidationError('Username must be 3 to 30 characters long and contain only letters, numbers, dots and underscores.');
  }

  if (!isValidEmail(cleanEmail)) {
    throw new ValidationError('Invalid e-mail format.');
  }

  if (!isValidPassword(password)) {
    throw new ValidationError(
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long (max ${BCRYPT_MAX_BYTES} bytes).`
    );
  }

  const cleanPicture =
    typeof profile_picture === 'string' ? profile_picture.trim() : profile_picture;

  if (!isValidProfilePicture(cleanPicture)) {
    throw new ValidationError('Invalid profile picture URL. Only public HTTPS links are allowed.');
  }

  let finalRole = 'common';

  if (role !== undefined && role !== null) {
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role)) {
      throw new ValidationError('Invalid role.');
    }

    if (PRIVILEGED_ROLES.includes(role)) {
      const isAdmin = isPlainObject(requestingUser) && requestingUser.role === 'adm';
      if (!isAdmin) {
        throw new ValidationError(
          `Only an authenticated admin can create a ${role === 'adm' ? 'admin' : 'moderator'} account.`,
          403
        );
      }
    }
    finalRole = role;
  }

  return {
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password,
    role: finalRole,
    profile_picture: cleanPicture ? cleanPicture : null,
  };
};

const toISO = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toUserResponseDTO = (user) => {
  if (!isPlainObject(user)) return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    profile_picture: user.profile_picture ?? null,
    createdAt: toISO(user.created_at || user.createdAt),
    plan: user.plan ?? null,
  };
};

module.exports = {
  ValidationError,
  validateCreateUserDTO,
  toUserResponseDTO,
  stripTags,
  isValidName,
  isValidPassword,
  isValidUsername,
  isValidEmail,
  isValidProfilePicture,
  USERNAME_REGEX,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
};