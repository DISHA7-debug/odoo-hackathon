const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findUserById, sanitizeUser } = require('../utils/dbHelpers');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { roleUpdateSchema } = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    let query = db('users')
      .select('id', 'name', 'email', 'role', 'department_id', 'status', 'created_at')
      .orderBy('name');

    if (req.user.role !== 'Admin') {
      if (!req.user.department_id) {
        return res.json([]);
      }
      query = query.where({ department_id: req.user.department_id });
    }

    const employees = await query;
    res.json(employees);
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
