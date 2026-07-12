const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { error: true, message: err.message };
    if (err.field) body.field = err.field;
    return res.status(err.statusCode).json(body);
  }

  if (err.code === '23505') {
    const message = err.detail?.includes('email')
      ? 'Email already registered'
      : 'Duplicate value violates unique constraint';
    const field = err.detail?.includes('email') ? 'email' : undefined;
    const body = { error: true, message };
    if (field) body.field = field;
    return res.status(409).json(body);
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: true,
      message: 'Referenced record does not exist',
    });
  }

  if (err.code === '23P01') {
    return res.status(409).json({
      error: true,
      message: 'Slot overlaps with an existing booking',
    });
  }

  console.error('[error]', err.message);

  return res.status(500).json({
    error: true,
    message: 'An unexpected error occurred',
  });
}

module.exports = errorHandler;
