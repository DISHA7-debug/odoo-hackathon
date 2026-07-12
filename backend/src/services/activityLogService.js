const db = require('../config/db');

/**
 * Shared activity log helper.
 * Arush's notification/audit modules may also write to activity_logs.
 */
async function logActivity(userId, action, entityType, entityId, metadata = {}, trx = db) {
  await trx('activity_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

module.exports = { logActivity };
