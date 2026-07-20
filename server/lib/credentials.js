const crypto = require('crypto');

// Login is now identified purely by username (no more typed-in tenant
// domain — see server/middleware/tenantResolver.js), so every onec_users
// row across every tenant must have a username unique enough to route on:
// "<tenant prefix>_<local part>". This file is the one place that builds
// both halves.

// Deliberately excludes 'i'/'I'/'l' (lowercase L) — the one ambiguity the
// password is meant to avoid (see generatePassword below); not used for
// the letters half of a username, which comes straight from a first name.
const PASSWORD_CHARS = 'ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz0123456789'.replace(/[iIl]/g, '');

function randomFrom(charset, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += charset[crypto.randomInt(charset.length)];
  return out;
}

function randomDigits(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += crypto.randomInt(10);
  return out;
}

// Simple, easy-to-read-aloud password: 8 characters mixing letters and
// digits, avoiding i/I/l as requested — no symbols, nothing complicated.
function generatePassword(length = 8) {
  return randomFrom(PASSWORD_CHARS, length);
}

// Up to 5 lowercase letters from a first name — the "adam" in qs_adam2345.
function lettersFromName(firstName) {
  const letters = String(firstName || '').toLowerCase().replace(/[^a-z]/g, '');
  return letters.slice(0, 5) || 'user';
}

// Up to 4 digits pulled straight out of an id string (registry_no/staff_id)
// — the "2345" in qs_adam2345, out of a registry number like "rhss2345-3".
function digitsFromId(idSeed) {
  return String(idSeed || '').replace(/[^0-9]/g, '').slice(0, 4);
}

// Builds "<prefix>_<local>" and normalizes a manually-typed local part
// (guardians, the first admin account) the same way an auto-generated one
// already is — lowercase, alphanumeric-and-underscore only. Idempotent: a
// value that already carries this tenant's prefix isn't double-prefixed.
function withTenantPrefix(prefix, rawUsername) {
  const normalizedPrefix = String(prefix || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLocal = String(rawUsername || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanLocal.startsWith(`${normalizedPrefix}_`)) return cleanLocal;
  return `${normalizedPrefix}_${cleanLocal}`;
}

// Generates a tenant-prefixed username from a first name + an id seed
// (registry_no for learners, staff_id for instructors/staff), retrying
// with fresh random digits on a collision. `db` is the tenant-scoped
// connection (req.db, or a bulk-upload job's own client) — must already
// have search_path set to the right schema.
async function generateUniqueUsername(db, prefix, firstName, idSeed) {
  const letters = lettersFromName(firstName);
  const idDigits = digitsFromId(idSeed);
  const preferId = idDigits.length === 4;

  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = attempt === 0 && preferId ? idDigits : randomDigits(4);
    const username = `${prefix}_${letters}${digits}`;
    const existing = await db.query('SELECT 1 FROM onec_users WHERE username = $1', [username]);
    if (existing.rows.length === 0) return username;
  }
  // 20 collisions in a row on a 4-digit random space is astronomically
  // unlikely — this just guarantees termination if it somehow happens.
  return `${prefix}_${letters}${randomDigits(6)}`;
}

// A synthetic email for accounts created without one (bulk upload rows
// that left the Email column blank, auto-generated learner/instructor/
// staff accounts) — onec_users.email is NOT NULL UNIQUE, and username is
// already guaranteed unique, so this trivially is too.
function placeholderEmail(username, tenantDomain) {
  return `${username}@${tenantDomain}`;
}

module.exports = {
  generatePassword,
  lettersFromName,
  digitsFromId,
  withTenantPrefix,
  generateUniqueUsername,
  placeholderEmail
};
