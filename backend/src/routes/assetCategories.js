const express = require('express');
const db = require('../config/db');
const { findCategoryById } = require('../utils/dbHelpers');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  categoryCreateSchema,
  categoryUpdateSchema,
} = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const categories = await db('asset_categories').select('*').orderBy('name');
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(['Admin']),
  validateBody(categoryCreateSchema),
  async (req, res, next) => {
    try {
      const { name, custom_fields } = req.body;
      const [category] = await db('asset_categories')
        .insert({
          name,
          custom_fields: custom_fields ?? {},
        })
        .returning('*');

      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id',
  requireRole(['Admin']),
  validateBody(categoryUpdateSchema),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await findCategoryById(id);

      const updates = { ...req.body };

      const [category] = await db('asset_categories')
        .where({ id })
        .update(updates)
        .returning('*');

      res.json(category);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
