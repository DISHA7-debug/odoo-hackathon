const express = require('express');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const categoryRoutes = require('./routes/assetCategories');
const employeeRoutes = require('./routes/employees');
const { assetsRouter, transferRouter } = require('./routes/assets');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

const app = express();

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
app.use('/api/v1/reports', reportsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Route not found' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`AssetFlow API listening on port ${env.port}`);
});

module.exports = app;
