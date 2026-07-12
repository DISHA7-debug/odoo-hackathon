const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findUserById, sanitizeUser } = require('../utils/dbHelpers');
const { parsePagination } = require('../utils/pagination');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { roleUpdateSchema } = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    let query = db('users');

    if (req.user.role !== 'Admin') {
      if (!req.user.department_id) {
        return res.json({ data: [], page, limit, total: 0 });
      }
      query = query.where({ department_id: req.user.department_id });
    }

    const [{ count }] = await query.clone().count('* as count');

    const employees = await query
      .select('id', 'name', 'email', 'role', 'department_id', 'status', 'created_at')
      .orderBy('name')
      .limit(limit)
      .offset(offset);

    res.json({
      data: employees,
      page,
      limit,
      total: parseInt(count, 10),
    });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id/role',
  requireRole(['Admin']),
  validateBody(roleUpdateSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await findUserById(id);

      const [user] = await db('users')
        .where({ id })
        .update({ role: req.body.role })
        .returning(['id', 'name', 'email', 'role', 'department_id', 'status', 'created_at']);

      res.json(sanitizeUser(user));
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
