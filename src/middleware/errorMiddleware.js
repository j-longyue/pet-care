const { AppError } = require('../utils/errors');

const errorMiddleware = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
    });
  }

  console.error(err);
  return res.status(500).json({
    error: 'Internal server error.',
  });
};

module.exports = errorMiddleware;