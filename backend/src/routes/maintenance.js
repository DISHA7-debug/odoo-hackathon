const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validateBody = require('../middleware/validateBody');
const {
  maintenanceCreateSchema,
  maintenanceStatusSchema,
} = require('../utils/validators');
const {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
} = require('../services/maintenanceService');

const router = express.Router();
const ALL_ROLES = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];
const MANAGER_ROLES = ['Admin', 'AssetManager'];

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const requests = await getMaintenanceRequests(req.query);
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole(ALL_ROLES),
  validateBody(maintenanceCreateSchema),
  async (req, res, next) => {
    try {
      const { photo_url, ...rest } = req.body;
      const request = await createMaintenanceRequest(
        { ...rest, photo_url: photo_url || null },
        req.user.id
      );
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:id/status',
  requireRole(MANAGER_ROLES),
  validateBody(maintenanceStatusSchema),
  async (req, res, next) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const updated = await updateMaintenanceStatus(requestId, req.body, req.user.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
