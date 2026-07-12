const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findAssetById } = require('../utils/dbHelpers');
const { transitionAssetStatus } = require('./assetStatusService');
const { logActivity } = require('./activityLogService');
const { notify } = require('./notificationService');

const MAINTENANCE_STATUSES = [
  'Pending', 'Approved', 'Rejected', 'TechnicianAssigned', 'InProgress', 'Resolved',
];

const VALID_TRANSITIONS = {
  Pending: ['Approved', 'Rejected'],
  Approved: ['TechnicianAssigned'],
  TechnicianAssigned: ['InProgress'],
  InProgress: ['Resolved'],
  Rejected: [],
  Resolved: [],
};

function isValidMaintenanceTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

async function getMaintenanceRequests({ status }) {
  let query = db('maintenance_requests as mr')
    .leftJoin('assets as a', 'mr.asset_id', 'a.id')
    .leftJoin('users as u', 'mr.raised_by', 'u.id')
    .select(
      'mr.*',
      'a.name as asset_name',
      'a.asset_tag',
      'u.name as raised_by_name'
    );

  if (status) {
    if (!MAINTENANCE_STATUSES.includes(status)) {
      throw new AppError('Invalid status value', 400, 'status');
    }
    query = query.where('mr.status', status);
  }

  return query.orderBy('mr.created_at', 'desc');
}

async function createMaintenanceRequest(
  { asset_id, issue_description, priority, photo_url },
  userId
) {
  await findAssetById(asset_id);

  const [request] = await db('maintenance_requests')
    .insert({
      asset_id,
      raised_by: userId,
      issue_description,
      priority,
      photo_url: photo_url || null,
      status: 'Pending',
    })
    .returning('*');

  await logActivity(userId, 'MAINTENANCE_REQUESTED', 'maintenance_request', request.id, {
    asset_id,
    priority,
  });

  return request;
}

async function updateMaintenanceStatus(requestId, { status, technician }, userId) {
  const request = await db('maintenance_requests').where({ id: requestId }).first();
  if (!request) {
    throw new AppError('Maintenance request not found', 404);
  }

  if (!MAINTENANCE_STATUSES.includes(status)) {
    throw new AppError('Invalid status value', 400, 'status');
  }

  if (!isValidMaintenanceTransition(request.status, status)) {
    throw new AppError(
      `Invalid transition: cannot move from ${request.status} to ${status}`,
      400,
      'status'
    );
  }

  const updateData = { status };

  if (status === 'Approved') {
    updateData.approved_by = userId;
    await transitionAssetStatus(
      request.asset_id,
      'Under Maintenance',
      userId,
      'Maintenance approved'
    );
  } else if (status === 'Rejected') {
    updateData.approved_by = userId;
  } else if (status === 'TechnicianAssigned') {
    if (!technician) {
      throw new AppError('technician is required when assigning a technician', 400, 'technician');
    }
    updateData.technician = technician;
  } else if (status === 'Resolved') {
    updateData.resolved_at = db.fn.now();
    await transitionAssetStatus(
      request.asset_id,
      'Available',
      userId,
      'Maintenance resolved'
    );
  }

  const [updated] = await db('maintenance_requests')
    .where({ id: requestId })
    .update(updateData)
    .returning('*');

  await logActivity(userId, 'MAINTENANCE_STATUS_CHANGED', 'maintenance_request', requestId, {
    from: request.status,
    to: status,
    asset_id: request.asset_id,
  });

  if (status === 'Approved') {
    await notify(
      request.raised_by,
      'MAINTENANCE_APPROVED',
      `Your maintenance request #${requestId} has been approved. The asset is now under maintenance.`
    );
  } else if (status === 'Rejected') {
    await notify(
      request.raised_by,
      'MAINTENANCE_REJECTED',
      `Your maintenance request #${requestId} has been rejected.`
    );
  } else if (status === 'Resolved') {
    await notify(
      request.raised_by,
      'MAINTENANCE_RESOLVED',
      `Your maintenance request #${requestId} has been resolved. The asset is now available.`
    );
  }

  return updated;
}

module.exports = {
  MAINTENANCE_STATUSES,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
};
