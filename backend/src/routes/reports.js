const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const MANAGER_ROLES = ['Admin', 'AssetManager'];

router.use(requireAuth);
router.use(requireRole(MANAGER_ROLES));

router.get('/maintenance-frequency', async (req, res, next) => {
  try {
    const rows = await db('maintenance_requests as mr')
      .join('assets as a', 'mr.asset_id', 'a.id')
      .join('asset_categories as c', 'a.category_id', 'c.id')
      .select('c.id as category_id', 'c.name as category_name')
      .count('mr.id as request_count')
      .groupBy('c.id', 'c.name')
      .orderBy('request_count', 'desc');

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/booking-heatmap', async (req, res, next) => {
  try {
    const rows = await db('bookings')
      .whereIn('status', ['Upcoming', 'Ongoing', 'Completed'])
      .select(
        db.raw('EXTRACT(DOW FROM start_time) as day_of_week'),
        db.raw('EXTRACT(HOUR FROM start_time) as hour_bucket')
      )
      .count('id as booking_count')
      .groupByRaw('EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time)')
      .orderBy(['day_of_week', 'hour_bucket']);

    res.json(rows.map((row) => ({
      day_of_week: parseInt(row.day_of_week, 10),
      hour_bucket: parseInt(row.hour_bucket, 10),
      booking_count: parseInt(row.booking_count, 10),
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
