const db = require('../config/db');

/**
 * Shared notification helper.
 * Call on every meaningful event across bookings, maintenance, and audit modules.
 */
async function notify(userId, type, message, trx = db) {
  const [notification] = await trx('notifications')
    .insert({ user_id: userId, type, message })
    .returning('*');
  return notification;
}

module.exports = { notify };
