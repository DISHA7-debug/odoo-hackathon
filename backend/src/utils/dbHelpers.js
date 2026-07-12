const db = require('../config/db');
const AppError = require('./AppError');

async function findById(table, id, label = 'Record') {
  const row = await db(table).where({ id }).first();
  if (!row) {
    throw new AppError(`${label} not found`, 404);
  }
  return row;
}

async function assertRefExists(table, id, label, field = null) {
  const row = await db(table).where({ id }).first();
  if (!row) {
    throw new AppError(`${label} not found`, 400, field);
  }
  return row;
}

async function findUserById(id) {
  return findById('users', id, 'User');
}

async function assertUserExists(id, field = 'employee_id') {
  return assertRefExists('users', id, 'User', field);
}

async function findDepartmentById(id) {
  return findById('departments', id, 'Department');
}

async function assertDepartmentExists(id, field = 'department_id') {
  return assertRefExists('departments', id, 'Department', field);
}

async function findCategoryById(id) {
  return findById('asset_categories', id, 'Asset category');
}

async function assertCategoryExists(id, field = 'category_id') {
  return assertRefExists('asset_categories', id, 'Asset category', field);
}

async function findAssetById(id) {
  return findById('assets', id, 'Asset');
}

async function assertNoDepartmentCycle(departmentId, parentDepartmentId) {
  if (!parentDepartmentId) return;

  if (parentDepartmentId === departmentId) {
    throw new AppError('Department cannot be its own parent', 400, 'parent_department_id');
  }

  let currentId = parentDepartmentId;
  const visited = new Set();

  while (currentId) {
    if (currentId === departmentId) {
      throw new AppError('Circular department hierarchy is not allowed', 400, 'parent_department_id');
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parent = await db('departments')
      .where({ id: currentId })
      .select('parent_department_id')
      .first();

    if (!parent) {
      throw new AppError('Department not found', 400, 'parent_department_id');
    }

    currentId = parent.parent_department_id;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = {
  findById,
  assertRefExists,
  findUserById,
  assertUserExists,
  findDepartmentById,
  assertDepartmentExists,
  findCategoryById,
  assertCategoryExists,
  findAssetById,
  assertNoDepartmentCycle,
  sanitizeUser,
};
