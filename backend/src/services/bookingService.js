const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findAssetById } = require('../utils/dbHelpers');
const { logActivity } = require('./activityLogService');
const { notify } = require('./notificationService');

function formatTimeRange(startTime, endTime) {
  const fmt = (ts) => {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  return `${fmt(startTime)}-${fmt(endTime)}`;
}

async function findOverlappingBooking(resourceAssetId, startTime, endTime, trx = db) {
  return trx('bookings')
    .where({ resource_asset_id: resourceAssetId })
    .whereIn('status', ['Upcoming', 'Ongoing'])
    .where('start_time', '<', endTime)
    .andWhere('end_time', '>', startTime)
    .first();
}

async function getBookings({ resource_asset_id, date }) {
  let query = db('bookings as b')
    .leftJoin('users as u', 'b.booked_by', 'u.id')
    .leftJoin('assets as a', 'b.resource_asset_id', 'a.id')
    .select(
      'b.*',
      'u.name as booked_by_name',
      'a.name as asset_name',
      'a.asset_tag'
    );

  if (resource_asset_id) {
    query = query.where('b.resource_asset_id', parseInt(resource_asset_id, 10));
  }
  if (date) {
    query = query.whereRaw('DATE(b.start_time) = ?', [date]);
  }

  return query.orderBy('b.start_time');
}

async function createBooking({ resource_asset_id, start_time, end_time }, userId) {
  const startTime = new Date(start_time);
  const endTime = new Date(end_time);

  if (endTime <= startTime) {
    throw new AppError('end_time must be after start_time', 400, 'end_time');
  }

  const asset = await findAssetById(resource_asset_id);
  if (!asset.is_bookable) {
    throw new AppError('This asset is not bookable', 400, 'resource_asset_id');
  }

  const overlap = await findOverlappingBooking(resource_asset_id, startTime, endTime);
  if (overlap) {
    throw new AppError(
      `Slot overlaps with an existing booking (${formatTimeRange(overlap.start_time, overlap.end_time)})`,
      409
    );
  }

  let booking;
  try {
    [booking] = await db('bookings')
      .insert({
        resource_asset_id,
        booked_by: userId,
        start_time: startTime,
        end_time: endTime,
        status: 'Upcoming',
      })
      .returning('*');
  } catch (err) {
    if (err.code === '23P01') {
      const dbOverlap = await findOverlappingBooking(resource_asset_id, startTime, endTime);
      const message = dbOverlap
        ? `Slot overlaps with an existing booking (${formatTimeRange(dbOverlap.start_time, dbOverlap.end_time)})`
        : 'Slot overlaps with an existing booking';
      throw new AppError(message, 409);
    }
    throw err;
  }

  await logActivity(userId, 'BOOKING_CREATED', 'booking', booking.id, {
    resource_asset_id,
    start_time,
    end_time,
  });

  await notify(
    userId,
    'BOOKING_CONFIRMED',
    `Your booking for ${asset.name} (${formatTimeRange(startTime, endTime)}) has been confirmed.`
  );

  return booking;
}

async function cancelBooking(bookingId, userId) {
  const booking = await db('bookings').where({ id: bookingId }).first();
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status === 'Cancelled') {
    throw new AppError('Booking is already cancelled', 400, 'status');
  }
  if (booking.status === 'Completed') {
    throw new AppError('Cannot cancel a completed booking', 400, 'status');
  }

  const [updated] = await db('bookings')
    .where({ id: bookingId })
    .update({ status: 'Cancelled' })
    .returning('*');

  const asset = await findAssetById(booking.resource_asset_id);

  await logActivity(userId, 'BOOKING_CANCELLED', 'booking', bookingId, {
    resource_asset_id: booking.resource_asset_id,
  });

  await notify(
    booking.booked_by,
    'BOOKING_CANCELLED',
    `Your booking for ${asset.name} (${formatTimeRange(booking.start_time, booking.end_time)}) has been cancelled.`
  );

  return updated;
}

module.exports = {
  findOverlappingBooking,
  formatTimeRange,
  getBookings,
  createBooking,
  cancelBooking,
};
