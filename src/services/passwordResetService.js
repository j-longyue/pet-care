const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { isValidPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } = require('../dtos/userDTO');

const RESET_TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const requestPasswordReset = async (identifier) => {
  if (typeof identifier !== 'string' || !identifier.trim()) {
    throw new Error('Enter your e-mail or username.');
  }

  const user = await userRepository.findByEmailOrUsername(identifier, identifier);

  const genericMessage = { message: 'If the user exists, a reset link has been sent to the registered e-mail.' };

  if (!user) {
    return genericMessage;
  }

  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS);

  await userRepository.setResetToken(user.id, tokenHash, expiresAt);

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${plainToken}`;
  await sendPasswordResetEmail(user.email, resetLink);

  return genericMessage;
};

const resetPassword = async (plainToken, newPassword) => {
  if (typeof plainToken !== 'string' || !plainToken.trim() || typeof newPassword !== 'string') {
    throw new Error('Invalid token or new password.');
  }

  if (!isValidPassword(newPassword)) {
    throw new Error(`The new password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long.`);
  }

  const tokenHash = hashToken(plainToken);
  const user = await userRepository.findByResetToken(tokenHash);

  if (!user) {
    throw new Error('Invalid or expired token.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await userRepository.updatePasswordAndClearToken(user.id, hashedPassword);

  return { message: 'Password successfully reset.' };
};

module.exports = { requestPasswordReset, resetPassword };