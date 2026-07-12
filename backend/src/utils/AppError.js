class AppError extends Error {
  constructor(message, statusCode = 400, field = null, payload = null) {
    super(message);
    this.statusCode = statusCode;
    this.field = field;
    this.payload = payload;
    this.isOperational = true;
  }
}

module.exports = AppError;
