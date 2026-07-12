const db = require('../config/db');
const AppError = require('../utils/AppError');
const { transitionAssetStatus } = require('./assetStatusService');
const { logActivity } = require('./activityLogService');
const { findAssetById, assertUserExists, assertDepartmentExists } = require('../utils/dbHelpers');

async function generateAssetTag(trx) {
  const result = await trx('assets')
    .max('id as max_id')
    .first();
  const nextNum = (result.max_id || 0) + 1;
  return `AF-${String(nextNum).padStart(4, '0')}`;
}

async function getActiveAllocation(assetId, trx = db) {
  return trx('asset_allocations as aa')
    .leftJoin('users as u', 'aa.employee_id', 'u.id')
    .where({ 'aa.asset_id': assetId, 'aa.status': 'Active' })
    .select(
      'aa.*',
      'u.id as holder_id',
      'u.name as holder_name'
    )
    .first();
}

async function allocateAsset(assetId, { employee_id, department_id, expected_return_date }, triggeredByUserId) {
  await findAssetById(assetId);
  await assertUserExists(employee_id, 'employee_id');
  if (department_id) await assertDepartmentExists(department_id, 'department_id');

  const existing = await getActiveAllocation(assetId);
  if (existing) {
    throw new AppError(
      `Currently held by ${existing.holder_name}`,
      409,
      null,
      {
        current_holder: { id: existing.holder_id, name: existing.holder_name },
        suggest_transfer: true,
      }
    );
  }

  return db.transaction(async (trx) => {
    const [allocation] = await trx('asset_allocations')
      .insert({
        asset_id: assetId,
        employee_id,
        department_id: department_id ?? null,
        expected_return_date,
        status: 'Active',
      })
      .returning('*');

    await transitionAssetStatus(assetId, 'Allocated', triggeredByUserId, 'Asset allocated', trx);

    await logActivity(
      triggeredByUserId,
      'ASSET_ALLOCATED',
      'asset',
      assetId,
      { allocation_id: allocation.id, employee_id },
      trx
    );

    return allocation;
  });
}

async function returnAsset(assetId, { condition_checkin_notes }, triggeredByUserId) {
  await findAssetById(assetId);

  const active = await getActiveAllocation(assetId);
  if (!active) {
    throw new AppError('No active allocation found for this asset', 400);
  }

  return db.transaction(async (trx) => {
    const [allocation] = await trx('asset_allocations')
      .where({ id: active.id })
      .update({
        status: 'Returned',
        actual_return_date: trx.raw('CURRENT_DATE'),
        condition_checkin_notes: condition_checkin_notes ?? null,
      })
      .returning('*');

    await transitionAssetStatus(assetId, 'Available', triggeredByUserId, 'Asset returned', trx);

    await logActivity(
      triggeredByUserId,
      'ASSET_RETURNED',
      'asset',
      assetId,
      { allocation_id: allocation.id },
      trx
    );

    return allocation;
  });
}

async function createTransferRequest(assetId, toUserId, fromUserId) {
  await findAssetById(assetId);
  await assertUserExists(toUserId, 'to_user_id');

  const active = await getActiveAllocation(assetId);
  if (!active) {
    throw new AppError('Asset has no active allocation to transfer', 400);
  }

  if (active.employee_id !== fromUserId) {
    throw new AppError('You can only request transfer for assets allocated to you', 403);
  }

  const pending = await db('transfer_requests')
    .where({ asset_id: assetId, status: 'Requested' })
    .first();
  if (pending) {
    throw new AppError('A pending transfer request already exists for this asset', 409);
  }

  const [request] = await db('transfer_requests')
    .insert({
      asset_id: assetId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'Requested',
    })
    .returning('*');

  await logActivity(
    fromUserId,
    'TRANSFER_REQUESTED',
    'transfer_request',
    request.id,
    { asset_id: assetId, to_user_id: toUserId }
  );

  return request;
}

async function resolveTransferRequest(requestId, decision, approvedByUserId) {
  const request = await db('transfer_requests').where({ id: requestId }).first();
  if (!request) {
    throw new AppError('Transfer request not found', 404);
  }
  if (request.status !== 'Requested') {
    throw new AppError('Transfer request has already been resolved', 400);
  }

  await assertUserExists(request.to_user_id, 'to_user_id');

  if (decision === 'Rejected') {
    const [updated] = await db('transfer_requests')
      .where({ id: requestId })
      .update({
        status: 'Rejected',
        approved_by: approvedByUserId,
        resolved_at: db.fn.now(),
      })
      .returning('*');

    await logActivity(
      approvedByUserId,
      'TRANSFER_REJECTED',
      'transfer_request',
      requestId,
      { asset_id: request.asset_id }
    );

    return updated;
  }

  return db.transaction(async (trx) => {
    const active = await getActiveAllocation(request.asset_id, trx);
    if (!active) {
      throw new AppError('Asset no longer has an active allocation', 400);
    }

    await trx('asset_allocations')
      .where({ id: active.id })
      .update({
        status: 'Returned',
        actual_return_date: trx.raw('CURRENT_DATE'),
        condition_checkin_notes: 'Closed due to transfer approval',
      });

    const [newAllocation] = await trx('asset_allocations')
      .insert({
        asset_id: request.asset_id,
        employee_id: request.to_user_id,
        department_id: active.department_id,
        expected_return_date: active.expected_return_date,
        status: 'Active',
      })
      .returning('*');

    const [updated] = await trx('transfer_requests')
      .where({ id: requestId })
      .update({
        status: 'Approved',
        approved_by: approvedByUserId,
        resolved_at: trx.fn.now(),
      })
      .returning('*');

    await logActivity(
      approvedByUserId,
      'TRANSFER_APPROVED',
      'transfer_request',
      requestId,
      {
        asset_id: request.asset_id,
        from_user_id: request.from_user_id,
        to_user_id: request.to_user_id,
        new_allocation_id: newAllocation.id,
      },
      trx
    );

    return { request: updated, allocation: newAllocation };
  });
}

module.exports = {
  generateAssetTag,
  getActiveAllocation,
  allocateAsset,
  returnAsset,
  createTransferRequest,
  resolveTransferRequest,
};
