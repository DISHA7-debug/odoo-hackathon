const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findAssetById, findUserById, findDepartmentById } = require('../utils/dbHelpers');
const { transitionAssetStatus } = require('./assetStatusService');
const { logActivity } = require('./activityLogService');
const { notify } = require('./notificationService');

const AUDIT_FINDING_RESULTS = ['Verified', 'Missing', 'Damaged'];

async function createAuditCycle(
  { scope_department_id, scope_location, date_range_start, date_range_end },
  userId
) {
  if (scope_department_id) {
    await findDepartmentById(scope_department_id);
  }

  const start = new Date(date_range_start);
  const end = new Date(date_range_end);
  if (end < start) {
    throw new AppError('date_range_end must be on or after date_range_start', 400, 'date_range_end');
  }

  const [cycle] = await db('audit_cycles')
    .insert({
      scope_department_id: scope_department_id || null,
      scope_location: scope_location || null,
      date_range_start,
      date_range_end,
      status: 'Open',
    })
    .returning('*');

  await logActivity(userId, 'AUDIT_CYCLE_CREATED', 'audit_cycle', cycle.id, {
    scope_department_id,
    scope_location,
    date_range_start,
    date_range_end,
  });

  return cycle;
}

async function assignAuditor(cycleId, auditorId, userId) {
  const cycle = await db('audit_cycles').where({ id: cycleId }).first();
  if (!cycle) {
    throw new AppError('Audit cycle not found', 404);
  }
  if (cycle.status === 'Closed') {
    throw new AppError('Cannot assign auditors to a closed audit cycle', 400, 'status');
  }

  await findUserById(auditorId);

  const [assignment] = await db('audit_assignments')
    .insert({ audit_cycle_id: cycleId, auditor_id: auditorId })
    .returning('*');

  await logActivity(userId, 'AUDIT_AUDITOR_ASSIGNED', 'audit_cycle', cycleId, {
    auditor_id: auditorId,
  });

  await notify(
    auditorId,
    'AUDIT_ASSIGNED',
    `You have been assigned to audit cycle #${cycleId}.`
  );

  return assignment;
}

async function addFinding(cycleId, { asset_id, result, notes }, userId) {
  const cycle = await db('audit_cycles').where({ id: cycleId }).first();
  if (!cycle) {
    throw new AppError('Audit cycle not found', 404);
  }
  if (cycle.status === 'Closed') {
    throw new AppError('Cannot add findings to a closed audit cycle', 400, 'status');
  }

  if (!AUDIT_FINDING_RESULTS.includes(result)) {
    throw new AppError('Invalid result value', 400, 'result');
  }

  await findAssetById(asset_id);

  const [finding] = await db('audit_findings')
    .insert({
      audit_cycle_id: cycleId,
      asset_id,
      result,
      notes: notes || null,
      recorded_by: userId,
    })
    .returning('*');

  await logActivity(userId, 'AUDIT_FINDING_RECORDED', 'audit_finding', finding.id, {
    audit_cycle_id: cycleId,
    asset_id,
    result,
  });

  if (result === 'Missing' || result === 'Damaged') {
    await notify(
      userId,
      'AUDIT_DISCREPANCY',
      `Audit discrepancy flagged: asset #${asset_id} marked as ${result} in cycle #${cycleId}.`
    );
  }

  return finding;
}

async function closeAuditCycle(cycleId, userId) {
  const cycle = await db('audit_cycles').where({ id: cycleId }).first();
  if (!cycle) {
    throw new AppError('Audit cycle not found', 404);
  }
  if (cycle.status === 'Closed') {
    throw new AppError('Audit cycle already closed', 409);
  }

  const missingFindings = await db('audit_findings')
    .where({ audit_cycle_id: cycleId, result: 'Missing' });

  await db.transaction(async (trx) => {
    await trx('audit_cycles').where({ id: cycleId }).update({ status: 'Closed' });

    for (const finding of missingFindings) {
      await transitionAssetStatus(
        finding.asset_id,
        'Lost',
        userId,
        `Confirmed missing in audit cycle #${cycleId}`,
        trx
      );
    }

    await logActivity(
      userId,
      'AUDIT_CYCLE_CLOSED',
      'audit_cycle',
      cycleId,
      { missing_count: missingFindings.length },
      trx
    );
  });

  const discrepancies = await db('audit_findings as af')
    .leftJoin('assets as a', 'af.asset_id', 'a.id')
    .where('af.audit_cycle_id', cycleId)
    .whereIn('af.result', ['Missing', 'Damaged'])
    .select(
      'af.id',
      'af.asset_id',
      'af.result',
      'af.notes',
      'a.name as asset_name',
      'a.asset_tag'
    );

  return {
    cycle_id: cycleId,
    status: 'Closed',
    discrepancies,
  };
}

module.exports = {
  AUDIT_FINDING_RESULTS,
  createAuditCycle,
  assignAuditor,
  addFinding,
  closeAuditCycle,
};
