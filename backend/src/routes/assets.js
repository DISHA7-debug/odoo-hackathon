const express = require('express');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { findCategoryById } = require('../utils/dbHelpers');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  assetCreateSchema,
  allocateSchema,
  returnSchema,
  transferRequestSchema,
  transferDecisionSchema,
  ASSET_STATUSES,
} = require('../utils/validators');
const { generateAssetTag, allocateAsset, returnAsset, createTransferRequest, resolveTransferRequest } = require('../services/allocationService');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { search, category_id, status, department_id, location } = req.query;

    let query = db('assets as a')
      .leftJoin('asset_categories as c', 'a.category_id', 'c.id')
      .select('a.*', 'c.name as category_name');

    if (search) {
      query = query.where(function whereSearch() {
        this.whereILike('a.name', `%${search}%`)
          .orWhereILike('a.asset_tag', `%${search}%`)
          .orWhereILike('a.serial_number', `%${search}%`);
      });
    }
    if (category_id) {
      query = query.where('a.category_id', parseInt(category_id, 10));
    }
    if (status) {
      if (!ASSET_STATUSES.includes(status)) {
        throw new AppError('Invalid status value', 400, 'status');
      }
      query = query.where('a.status', status);
    }
    if (location) {
      query = query.whereILike('a.location', `%${location}%`);
    }
    if (department_id) {
      query = query
        .join('asset_allocations as aa', function joinActive() {
          this.on('aa.asset_id', '=', 'a.id').andOn('aa.status', '=', db.raw("'Active'"));
        })
        .where('aa.department_id', parseInt(department_id, 10));
    }

    const assets = await query.orderBy('a.id');
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(['Admin', 'AssetManager']),
  validateBody(assetCreateSchema),
  async (req, res, next) => {
    try {
      const { category_id, photo_url, ...rest } = req.body;
      await findCategoryById(category_id);

      const asset = await db.transaction(async (trx) => {
        const asset_tag = await generateAssetTag(trx);
        const [created] = await trx('assets')
          .insert({
            ...rest,
            category_id,
            asset_tag,
            photo_url: photo_url || null,
          })
          .returning('*');
        return created;
      });

      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  }
);

router.get(['/:id', '/:id/detail'], async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const asset = await db('assets as a')
      .leftJoin('asset_categories as c', 'a.category_id', 'c.id')
      .where('a.id', id)
      .select('a.*', 'c.name as category_name')
      .first();

    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const allocation_history = await db('asset_allocations as aa')
      .leftJoin('users as u', 'aa.employee_id', 'u.id')
      .leftJoin('departments as d', 'aa.department_id', 'd.id')
      .where('aa.asset_id', id)
      .select(
        'aa.*',
        'u.name as employee_name',
        'd.name as department_name'
      )
      .orderBy('aa.created_at', 'desc');

    const maintenance_history = await db('maintenance_requests as mr')
      .leftJoin('users as u', 'mr.raised_by', 'u.id')
      .where('mr.asset_id', id)
      .select(
        'mr.*',
        'u.name as raised_by_name'
      )
      .orderBy('mr.created_at', 'desc');

    res.json({
      ...asset,
      allocation_history,
      maintenance_history,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/allocate',
  requireRole(['Admin', 'AssetManager', 'DepartmentHead']),
  validateBody(allocateSchema),
  async (req, res, next) => {
    try {
      const assetId = parseInt(req.params.id, 10);
      const allocation = await allocateAsset(assetId, req.body, req.user.id);
      res.json({ allocation_id: allocation.id, status: allocation.status });
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 409 && err.payload) {
        return res.status(409).json({
          error: true,
          message: err.message,
          ...err.payload,
        });
      }
      next(err);
    }
  }
);

router.post(
  '/:id/return',
  requireRole(['Admin', 'AssetManager', 'DepartmentHead']),
  validateBody(returnSchema),
  async (req, res, next) => {
    try {
      const assetId = parseInt(req.params.id, 10);
      const allocation = await returnAsset(assetId, req.body, req.user.id);
      res.json({ allocation_id: allocation.id, status: allocation.status });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/transfer-request',
  validateBody(transferRequestSchema),
  async (req, res, next) => {
    try {
      const assetId = parseInt(req.params.id, 10);
      const request = await createTransferRequest(assetId, req.body.to_user_id, req.user.id);
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  }
);

const transferRouter = express.Router();
transferRouter.use(requireAuth);

transferRouter.post(
  '/:id/approve',
  requireRole(['Admin', 'AssetManager', 'DepartmentHead']),
  validateBody(transferDecisionSchema),
  async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const result = await resolveTransferRequest(requestId, req.body.decision, req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = { assetsRouter: router, transferRouter };
