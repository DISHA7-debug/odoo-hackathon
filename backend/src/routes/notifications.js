const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const [{ count }] = await db('notifications')
      .where({ user_id: req.user.id })
      .count('id as count');

    const notifications = await db('notifications')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total: parseInt(count, 10),
        total_pages: Math.ceil(parseInt(count, 10) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const notification = await db('notifications')
      .where({ id: notificationId, user_id: req.user.id })
      .first();

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const [updated] = await db('notifications')
      .where({ id: notificationId })
      .update({ is_read: true })
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
