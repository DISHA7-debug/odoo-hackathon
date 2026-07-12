const db = require('../config/db');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activityLogService');

const VALID_TRANSITIONS = {
  Available: ['Allocated', 'Reserved', 'Under Maintenance', 'Retired', 'Lost'],
  Allocated: ['Available', 'Under Maintenance', 'Lost'],
  Reserved: ['Available'],
  'Under Maintenance': ['Available'],
  Retired: ['Disposed'],
  Lost: [],
  Disposed: [],
};

function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Central asset status transition service.
 * Other modules (bookings, maintenance, audit) must call this — never update assets.status directly.
 */
async function transitionAssetStatus(assetId, newStatus, triggeredByUserId, reason = null, trx = db) {
  const asset = await trx('assets').where({ id: assetId }).first();
  if (!asset) {
    throw new AppError('Asset not found', 404);
  }

  if (asset.status === newStatus) {
    return asset;
  }

  if (!isValidTransition(asset.status, newStatus)) {
    throw new AppError(
      `Invalid transition: ${asset.status} -> ${newStatus}`,
      400,
      'status'
    );
  }

  const [updated] = await trx('assets')
    .where({ id: assetId })
    .update({ status: newStatus })
    .returning('*');

  await logActivity(
    triggeredByUserId,
    'ASSET_STATUS_CHANGED',
    'asset',
    assetId,
    { from: asset.status, to: newStatus, reason },
    trx
  );

  return updated;
}

module.exports = { transitionAssetStatus, isValidTransition };
