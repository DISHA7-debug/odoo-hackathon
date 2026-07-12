require('dotenv').config();

const db = require('../src/config/db');
const AppError = require('../src/utils/AppError');
const {
  findOverlappingBooking,
  createBooking,
  formatTimeRange,
} = require('../src/services/bookingService');

let RESOURCE_ASSET_ID; // Dynamically resolved Boardroom Alpha

async function assertThrows(fn, expectedStatus, label) {
  try {
    await fn();
    console.error(`FAIL: ${label} — expected ${expectedStatus} but succeeded`);
    process.exit(1);
  } catch (err) {
    if (!(err instanceof AppError) || err.statusCode !== expectedStatus) {
      console.error(`FAIL: ${label} — expected status ${expectedStatus}, got`, err.message);
      process.exit(1);
    }
    console.log(`PASS: ${label} — ${err.message}`);
  }
}

async function assertRawInsertRejected(label, userId) {
  const baseDate = '2026-07-13';

  try {
    await db('bookings').insert({
      resource_asset_id: RESOURCE_ASSET_ID,
      booked_by: userId,
      start_time: new Date(`${baseDate}T09:30:00`),
      end_time: new Date(`${baseDate}T10:30:00`),
      status: 'Upcoming',
    });
    console.error(`FAIL: ${label} — raw insert should have been rejected`);
    process.exit(1);
  } catch (err) {
    if (err.code !== '23P01') {
      console.error(`FAIL: ${label} — expected Postgres code 23P01, got`, err.code, err.message);
      process.exit(1);
    }
    console.log(`PASS: ${label} — Postgres exclusion constraint rejected overlapping insert`);
  }
}

async function runTests() {
  console.log('Running booking overlap tests...');

  const boardroom = await db('assets').where({ asset_tag: 'AF-0013' }).first();
  if (!boardroom) {
    console.error('FAIL: Boardroom Alpha (AF-0013) not found');
    process.exit(1);
  }
  RESOURCE_ASSET_ID = boardroom.id;

  const constraint = await db.raw(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_time_overlap'
  `);
  if (!constraint.rows.length) {
    console.error('FAIL: bookings_no_time_overlap constraint not found in pg_constraint');
    process.exit(1);
  }
  console.log('PASS: bookings_no_time_overlap exclusion constraint exists');

  await db('notifications').where('type', 'BOOKING_CONFIRMED').del();
  await db('activity_logs').where('action', 'BOOKING_CREATED').del();
  await db('bookings').where({ resource_asset_id: RESOURCE_ASSET_ID }).del();

  const userId = (await db('users').where({ email: 'priya@assetflow.com' }).first()).id;

  const baseDate = '2026-07-13';
  const existingStart = new Date(`${baseDate}T09:00:00`);
  const existingEnd = new Date(`${baseDate}T10:00:00`);

  await db('bookings').insert({
    resource_asset_id: RESOURCE_ASSET_ID,
    booked_by: userId,
    start_time: existingStart,
    end_time: existingEnd,
    status: 'Upcoming',
  });

  const overlap = await findOverlappingBooking(
    RESOURCE_ASSET_ID,
    new Date(`${baseDate}T09:30:00`),
    new Date(`${baseDate}T10:30:00`)
  );
  if (!overlap) {
    console.error('FAIL: overlap query should find existing 09:00-10:00 booking');
    process.exit(1);
  }
  console.log(`PASS: overlap query detected (${formatTimeRange(overlap.start_time, overlap.end_time)})`);

  await assertThrows(
    () => createBooking({
      resource_asset_id: RESOURCE_ASSET_ID,
      start_time: `${baseDate}T09:30:00`,
      end_time: `${baseDate}T10:30:00`,
    }, userId),
    409,
    '09:30-10:30 rejected (overlaps 09:00-10:00)'
  );

  const adjacent = await createBooking({
    resource_asset_id: RESOURCE_ASSET_ID,
    start_time: `${baseDate}T10:00:00`,
    end_time: `${baseDate}T11:00:00`,
  }, userId);

  if (!adjacent || adjacent.status !== 'Upcoming') {
    console.error('FAIL: 10:00-11:00 should succeed');
    process.exit(1);
  }
  console.log('PASS: 10:00-11:00 accepted (adjacent, no overlap)');

  await assertRawInsertRejected('raw overlapping insert blocked by DB constraint', userId);

  console.log('\nAll booking overlap tests passed.');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
