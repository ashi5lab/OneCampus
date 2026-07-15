const crypto = require('crypto');
const { REFRESH_TOKEN_TTL_DAYS } = require('../config/env');

// Refresh tokens are opaque random values, not JWTs — revocation just means
// deleting/marking a DB row, no second signing secret or verify path to
// maintain. Only the SHA-256 hash is stored (mirrors password_hash's
// principle); a DB leak alone doesn't yield a usable token. SHA-256 (not
// bcrypt) is appropriate here because the token itself is already
// high-entropy random data, not a low-entropy user-chosen secret — there's
// nothing for bcrypt's slow, salted hashing to defend against that a fast
// hash doesn't already cover.
function generateRawToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueRefreshToken(db, userId) {
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    'INSERT INTO onec_refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(rawToken), expiresAt]
  );

  return { rawToken, expiresAt };
}

// Validates a raw refresh token and rotates it: the matched row is marked
// revoked and a new token is issued in the same call, so a refresh token
// is single-use — replaying an already-used one fails a lookup for an
// unrevoked, unexpired row and returns null.
async function rotateRefreshToken(db, rawToken) {
  const tokenHash = hashToken(rawToken);

  const result = await db.query(
    `SELECT id, user_id FROM onec_refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (result.rows.length === 0) return null;

  const { id, user_id } = result.rows[0];
  await db.query('UPDATE onec_refresh_tokens SET revoked_at = NOW() WHERE id = $1', [id]);

  const next = await issueRefreshToken(db, user_id);
  return { userId: user_id, ...next };
}

async function revokeRefreshToken(db, rawToken) {
  await db.query(
    'UPDATE onec_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashToken(rawToken)]
  );
}

module.exports = { issueRefreshToken, rotateRefreshToken, revokeRefreshToken };
