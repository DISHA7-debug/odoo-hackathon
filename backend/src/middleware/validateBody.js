const AppError = require('../utils/AppError');

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.length ? issue.path.join('.') : null;
      return next(new AppError(issue.message, 400, field));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validateBody;
