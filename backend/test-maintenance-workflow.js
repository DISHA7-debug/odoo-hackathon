require('dotenv').config();

const db = require('./src/config/db');
const AppError = require('./src/utils/AppError');
const {
  createMaintenanceRequest,
  updateMaintenanceStatus,
} = require('./src/services/maintenanceService');

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

async function runTests() {
  console.log('Running maintenance workflow tests...');

  const employee = await db('users').where({ email: 'priya@assetflow.com' }).first();
  const manager = await db('users').where({ email: 'rahul.manager@assetflow.com' }).first();
  const asset = await db('assets').where({ asset_tag: 'AF-0003' }).first();

  await db('notifications').del();
  await db('activity_logs').where('entity_type', 'maintenance_request').del();
  await db('maintenance_requests').where({ asset_id: asset.id }).del();
  await db('assets').where({ id: asset.id }).update({ status: 'Available' });

  const request = await createMaintenanceRequest({
    asset_id: asset.id,
    issue_description: 'Printer jammed',
    priority: 'High',
  }, employee.id);

  await assertThrows(
    () => updateMaintenanceStatus(request.id, { status: 'Resolved' }, manager.id),
    400,
    'Pending -> Resolved blocked'
  );

  await updateMaintenanceStatus(request.id, { status: 'Approved' }, manager.id);

  const assetAfterApprove = await db('assets').where({ id: asset.id }).first();
  if (assetAfterApprove.status !== 'Under Maintenance') {
    console.error('FAIL: asset should be Under Maintenance after approval');
    process.exit(1);
  }
  console.log('PASS: Approved transitions asset to Under Maintenance');

  await updateMaintenanceStatus(request.id, { status: 'TechnicianAssigned', technician: 'Raj Tech' }, manager.id);
  await updateMaintenanceStatus(request.id, { status: 'InProgress' }, manager.id);
  await updateMaintenanceStatus(request.id, { status: 'Resolved' }, manager.id);

  const assetAfterResolve = await db('assets').where({ id: asset.id }).first();
  if (assetAfterResolve.status !== 'Available') {
    console.error('FAIL: asset should be Available after resolved');
    process.exit(1);
  }
  console.log('PASS: Resolved transitions asset back to Available');

  console.log('\nAll maintenance workflow tests passed.');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
