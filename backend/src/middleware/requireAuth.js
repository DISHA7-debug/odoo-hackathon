const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');
const AppError = require('../utils/AppError');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.slice(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await db('users')
      .select('id', 'role', 'department_id', 'status')
      .where({ id: decoded.userId })
      .first();

    if (!user || user.status !== 'Active') {
      throw new AppError('Invalid or expired token', 401);
    }

    req.user = {
      id: user.id,
      role: user.role,
      department_id: user.department_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
