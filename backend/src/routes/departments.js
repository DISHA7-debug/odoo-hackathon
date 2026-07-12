const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const {
  findDepartmentById,
  assertDepartmentExists,
  assertUserExists,
  assertNoDepartmentCycle,
} = require('../utils/dbHelpers');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  departmentCreateSchema,
  departmentUpdateSchema,
} = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const departments = await db('departments').select('*').orderBy('name');
    res.json(departments);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(['Admin']),
  validateBody(departmentCreateSchema),
  async (req, res, next) => {
    try {
      const { name, head_user_id, parent_department_id, status } = req.body;

      if (head_user_id != null) await assertUserExists(head_user_id, 'head_user_id');
      if (parent_department_id != null) {
        await assertDepartmentExists(parent_department_id, 'parent_department_id');
      }

      const [department] = await db('departments')
        .insert({
          name,
          head_user_id: head_user_id ?? null,
          parent_department_id: parent_department_id ?? null,
          status: status ?? 'Active',
        })
        .returning('*');

      res.status(201).json(department);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireRole(['Admin']),
  validateBody(departmentUpdateSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await findDepartmentById(id);

      const { head_user_id, parent_department_id } = req.body;
      if (head_user_id != null) await assertUserExists(head_user_id, 'head_user_id');
      if (parent_department_id != null) {
        await assertNoDepartmentCycle(id, parent_department_id);
        await assertDepartmentExists(parent_department_id, 'parent_department_id');
      }

      const [department] = await db('departments')
        .where({ id })
        .update(req.body)
        .returning('*');

      res.json(department);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
