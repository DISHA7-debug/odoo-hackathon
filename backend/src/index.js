const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const categoryRoutes = require('./routes/assetCategories');
const employeeRoutes = require('./routes/employees');
const { assetsRouter, transferRouter } = require('./routes/assets');
const dashboardRoutes = require('./routes/dashboard');
const bookingRoutes = require('./routes/bookings');
const maintenanceRoutes = require('./routes/maintenance');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications');
const activityLogRoutes = require('./routes/activityLogs');
const reportRoutes = require('./routes/reports');

const app = express();

// TODO: scope CORS to a specific frontend origin before production deployment
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/asset-categories', categoryRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/transfer-requests', transferRouter);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/maintenance-requests', maintenanceRoutes);
app.use('/api/v1/audit-cycles', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/activity-logs', activityLogRoutes);
app.use('/api/v1/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Route not found' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`AssetFlow API listening on port ${env.port}`);
});

module.exports = app;
