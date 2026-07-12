require('dotenv').config();

const db = require('./src/config/db');
const AppError = require('./src/utils/AppError');
const {
  addFinding
} = require('./src/services/auditService');

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
  console.log('Running audit findings tests...');
  
  const cycle = await db('audit_cycles').first();
  // Get two assets that don't have findings in this cycle
  const existingFindings = await db('audit_findings').where({ audit_cycle_id: cycle.id }).pluck('asset_id');
  const assets = await db('assets').whereNotIn('id', existingFindings).limit(2);
  const asset1 = assets[0];
  const asset2 = assets[1];
  
  // Admin
  const admin = await db('users').where({ role: 'Admin' }).first();
  
  // Unassigned AssetManager
  const rahul = await db('users').where({ email: 'rahul.manager@assetflow.com' }).first();
  
  // Assigned AssetManager
  const sneha = await db('users').where({ email: 'sneha.manager@assetflow.com' }).first();

  await assertThrows(
    () => addFinding(cycle.id, { asset_id: asset1.id, result: 'Verified' }, rahul.id),
    403,
    'Unassigned AssetManager gets 403'
  );
  
  await addFinding(cycle.id, { asset_id: asset1.id, result: 'Verified' }, sneha.id);
  console.log('PASS: Assigned AssetManager succeeds');
  
  await addFinding(cycle.id, { asset_id: asset2.id, result: 'Verified' }, admin.id);
  console.log('PASS: Admin succeeds regardless of assignment');
  
  console.log('\nAll audit findings tests passed.');
}

runTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
