require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  console.warn(`[env] ${name} not set — using an insecure development fallback. Set this before deploying.`);
  return devFallback;
}

module.exports = {
  JWT_SECRET: required('JWT_SECRET', 'fallback-secret-for-dev'),
  isProd,
};
