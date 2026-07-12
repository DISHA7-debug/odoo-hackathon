const db = require('../config/db');
const AppError = require('./AppError');

async function findById(table, id, label = 'Record') {
  const row = await db(table).where({ id }).first();
  if (!row) {
    throw new AppError(`${label} not found`, 404);
  }
  return row;
}

async function findUserById(id) {
  return findById('users', id, 'User');
}

async function findDepartmentById(id) {
  return findById('departments', id, 'Department');
}

async function findCategoryById(id) {
  return findById('asset_categories', id, 'Asset category');
}

async function findAssetById(id) {
  return findById('assets', id, 'Asset');
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = {
  findById,
  findUserById,
  findDepartmentById,
  findCategoryById,
  findAssetById,
  sanitizeUser,
};
