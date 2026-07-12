const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const MANAGER_ROLES = ['Admin', 'AssetManager'];

router.use(requireAuth);
router.use(requireRole(MANAGER_ROLES));

// --- From backend-disha ---
router.get('/utilization', async (req, res, next) => {
  try {
    const sortIdle = req.query.sort === 'idle';

    const rows = await db('assets as a')
      .leftJoin('asset_allocations as aa', 'aa.asset_id', 'a.id')
      .select(
        'a.id as asset_id',
        'a.asset_tag',
        'a.name',
        db.raw('COUNT(aa.id)::int as allocation_count'),
        db.raw(`
          COALESCE(
            SUM(
              (COALESCE(aa.actual_return_date, CURRENT_DATE) - aa.allocated_date)
            ),
            0
          )::int as total_days_allocated
        `)
      )
      .groupBy('a.id', 'a.asset_tag', 'a.name')
      .orderBy('allocation_count', sortIdle ? 'asc' : 'desc')
      .orderBy('a.id');

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/department-allocation', async (req, res, next) => {
  try {
    const rows = await db('departments as d')
      .leftJoin('asset_allocations as aa', function joinActive() {
        this.on('aa.department_id', '=', 'd.id').andOn('aa.status', '=', db.raw("'Active'"));
      })
      .select(
        'd.id as department_id',
        'd.name as department_name',
        db.raw('COALESCE(COUNT(aa.id), 0)::int as active_allocations')
      )
      .groupBy('d.id', 'd.name')
      .orderBy('d.name');

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/nearing-retirement', async (req, res, next) => {
  try {
    const years = Math.max(1, parseInt(req.query.years || '5', 10) || 5);

    const rows = await db('assets as a')
      .whereNotNull('a.acquisition_date')
      .whereNotIn('a.status', ['Retired', 'Disposed'])
      .whereRaw('a.acquisition_date < CURRENT_DATE - (? * INTERVAL \'1 year\')', [years])
      .select(
        'a.id as asset_id',
        'a.asset_tag',
        'a.name',
        'a.acquisition_date',
        db.raw('ROUND((CURRENT_DATE - a.acquisition_date) / 365.25, 1) as age_years')
      )
      .orderBy('age_years', 'desc')
      .orderBy('a.id');

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --- From backend-arush ---
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
