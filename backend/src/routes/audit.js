const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validateBody = require('../middleware/validateBody');
const {
  auditCycleCreateSchema,
  auditAssignAuditorSchema,
  auditFindingSchema,
} = require('../utils/validators');
const {
  createAuditCycle,
  assignAuditor,
  addFinding,
  closeAuditCycle,
} = require('../services/auditService');

const router = express.Router();
const MANAGER_ROLES = ['Admin', 'AssetManager'];

router.use(requireAuth);

router.post(
  '/',
  requireRole(['Admin']),
  validateBody(auditCycleCreateSchema),
  async (req, res, next) => {
    try {
      const cycle = await createAuditCycle(req.body, req.user.id);
      res.status(201).json(cycle);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/assign-auditor',
  requireRole(MANAGER_ROLES),
  validateBody(auditAssignAuditorSchema),
  async (req, res, next) => {
    try {
      const cycleId = parseInt(req.params.id, 10);
      const assignment = await assignAuditor(cycleId, req.body.auditor_id, req.user.id);
      res.status(201).json(assignment);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/findings',
  requireRole(MANAGER_ROLES),
  validateBody(auditFindingSchema),
  async (req, res, next) => {
    try {
      const cycleId = parseInt(req.params.id, 10);
      const finding = await addFinding(cycleId, req.body, req.user.id);
      res.status(201).json(finding);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/close',
  requireRole(MANAGER_ROLES),
  async (req, res, next) => {
    try {
      const cycleId = parseInt(req.params.id, 10);
      const result = await closeAuditCycle(cycleId, req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
