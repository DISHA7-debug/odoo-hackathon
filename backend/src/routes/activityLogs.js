const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['Admin']));

router.get('/', async (req, res, next) => {
  try {
    const { user_id, entity_type, start_date, end_date } = req.query;

    let query = db('activity_logs as al')
      .leftJoin('users as u', 'al.user_id', 'u.id')
      .select('al.*', 'u.name as user_name');

    if (user_id) {
      query = query.where('al.user_id', parseInt(user_id, 10));
    }
    if (entity_type) {
      query = query.where('al.entity_type', entity_type);
    }
    if (start_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        throw new AppError('Invalid start_date format, use YYYY-MM-DD', 400, 'start_date');
      }
      query = query.where('al.timestamp', '>=', start_date);
    }
    if (end_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        throw new AppError('Invalid end_date format, use YYYY-MM-DD', 400, 'end_date');
      }
      query = query.where('al.timestamp', '<=', `${end_date} 23:59:59`);
    }

    const logs = await query.orderBy('al.timestamp', 'desc').limit(500);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
