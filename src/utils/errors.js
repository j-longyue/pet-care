class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied.') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists.') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};