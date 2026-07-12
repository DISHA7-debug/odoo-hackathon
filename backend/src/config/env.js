require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

if (!env.databaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production');
}

module.exports = env;
