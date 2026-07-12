const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validateBody = require('../middleware/validateBody');
const { bookingCreateSchema } = require('../utils/validators');
const { getBookings, createBooking, cancelBooking } = require('../services/bookingService');

const router = express.Router();
const ALL_ROLES = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const bookings = await getBookings(req.query);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(ALL_ROLES),
  validateBody(bookingCreateSchema),
  async (req, res, next) => {
    try {
      const booking = await createBooking(req.body, req.user.id);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/cancel',
  requireRole(ALL_ROLES),
  async (req, res, next) => {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const booking = await cancelBooking(bookingId, req.user.id);
      res.json(booking);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
