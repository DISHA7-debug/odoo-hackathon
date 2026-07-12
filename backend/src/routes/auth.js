const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/dbHelpers');
const validateBody = require('../middleware/validateBody');
const requireAuth = require('../middleware/requireAuth');
const { signupSchema, loginSchema } = require('../utils/validators');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: true, message: 'Too many attempts, try again shortly' },
});

router.post('/signup', authLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) {
      throw new AppError('Email already registered', 409, 'email');
    }

    const password_hash = await hashPassword(password);
    const [user] = await db('users')
      .insert({ name, email, password_hash, role: 'Employee' })
      .returning(['id', 'name', 'email', 'role', 'department_id', 'status', 'created_at']);

    res.status(201).json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user || user.status !== 'Active') {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({ userId: user.id });
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
