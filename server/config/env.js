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
  // 400 days — Chrome's own hard cap on any cookie's Max-Age (RFC 6265bis);
  // asking for longer just gets silently clamped to this by the browser, so
  // this is as close to "session never expires" as a cookie can actually
  // get. Combined with rotation-on-use (lib/refreshTokens.js — every
  // refresh issues a fresh 400-day token), an actively-used session's
  // expiry keeps sliding forward and never actually arrives; only real
  // inactivity beyond 400 days, a password change, or an explicit
  // logout/admin-forced-logout (both call lib/refreshTokens.js's
  // revokeAllUserTokens) ever end it. Was 30 days; bumped after repeated
  // "why do I have to log in again" reports — a school-management app used
  // like a native mobile app has no natural "session", unlike a banking
  // site where short expiry is the point.
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 400,
  // Self-registered tenants pick a short slug (e.g. "greenwood") and get
  // `${slug}.${TENANT_BASE_DOMAIN}` as their domain — mirrors the existing
  // dev tenant naming convention (dev.onecampus.local, dev2.onecampus.local).
  TENANT_BASE_DOMAIN: process.env.TENANT_BASE_DOMAIN || 'onecampus.local',
  // Super admin has no refresh-token/rotation flow yet (see
  // server/modules/platform) — a longer-lived single token is an
  // intentional simplification until that admin surface is built out.
  SUPER_ADMIN_TOKEN_TTL: process.env.SUPER_ADMIN_TOKEN_TTL || '12h',
  // Profile picture uploads (server/lib/cloudinary.js). No dev fallback —
  // unset means uploads are simply disabled (503), not a broken default.
  // This Cloudinary account is shared across multiple unrelated apps, so
  // every upload here is namespaced under an "onecampus/" folder — see
  // lib/cloudinary.js.
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  isProd,
};
