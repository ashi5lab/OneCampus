const crypto = require('crypto');
const { isProd, REFRESH_TOKEN_TTL_DAYS } = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';
const CSRF_COOKIE_NAME = 'csrfToken';
const REFRESH_TOKEN_PATH = '/api/v1/auth'; // only sent to auth endpoints, not every request

function setAuthCookies(res, rawRefreshToken) {
  const maxAge = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: REFRESH_TOKEN_PATH,
    maxAge
  });

  // Rotated alongside the refresh token so a stolen old CSRF token is
  // useless once the refresh token it was paired with has been rotated out.
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // the frontend must be able to read this to echo it back as a header
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge
  });

  return csrfToken;
}

function clearAuthCookies(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_TOKEN_PATH });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

module.exports = { setAuthCookies, clearAuthCookies, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME };
