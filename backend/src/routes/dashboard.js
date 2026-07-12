const express = require('express');
const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/kpis', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const sevenDaysStr = sevenDaysOut.toISOString().slice(0, 10);

    const [{ count: assets_available }] = await db('assets')
      .where({ status: 'Available' })
      .count('* as count');

    const [{ count: assets_allocated }] = await db('assets')
      .where({ status: 'Allocated' })
      .count('* as count');

    const [{ count: pending_transfers }] = await db('transfer_requests')
      .where({ status: 'Requested' })
      .count('* as count');

    const [{ count: upcoming_returns }] = await db('asset_allocations')
      .where({ status: 'Active' })
      .whereNotNull('expected_return_date')
      .where('expected_return_date', '<=', sevenDaysStr)
      .where('expected_return_date', '>=', today)
      .count('* as count');

    const overdue_returns = await db('asset_allocations as aa')
      .join('assets as a', 'aa.asset_id', 'a.id')
      .leftJoin('users as u', 'aa.employee_id', 'u.id')
      .where('aa.status', 'Active')
      .whereNotNull('aa.expected_return_date')
      .where('aa.expected_return_date', '<', today)
      .select(
        'a.id as asset_id',
        'a.asset_tag',
        'u.name as employee',
        'aa.expected_return_date'
      );

    const [{ count: maintenance_today }] = await db('maintenance_requests')
      .whereNotIn('status', ['Resolved', 'Rejected'])
      .where(function whereMaintenanceToday() {
        this.whereRaw('DATE(created_at) = CURRENT_DATE')
          .orWhereIn('status', ['Approved', 'TechnicianAssigned', 'InProgress']);
      })
      .count('* as count');

    const [{ count: active_bookings }] = await db('bookings')
      .whereIn('status', ['Upcoming', 'Ongoing'])
      .count('* as count');

    res.json({
      assets_available: parseInt(assets_available, 10),
      assets_allocated: parseInt(assets_allocated, 10),
      maintenance_today: parseInt(maintenance_today, 10),
      active_bookings: parseInt(active_bookings, 10),
      pending_transfers: parseInt(pending_transfers, 10),
      upcoming_returns: parseInt(upcoming_returns, 10),
      overdue_returns,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
