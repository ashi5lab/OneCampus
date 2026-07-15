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
  // The frontend's origin — CORS must echo this exact origin (not '*') for
  // credentialed (cookie-carrying) requests to work at all; browsers reject
  // Access-Control-Allow-Origin: * when a request includes credentials.
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  isProd,
};
