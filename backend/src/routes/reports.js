const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['Admin', 'AssetManager']));

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

module.exports = router;
