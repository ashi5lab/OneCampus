// These are integration tests, not unit tests — they make real HTTP calls
// against a running `node server.js`, which talks to the real Railway dev
// database. See tests/README.md for why, and for the tradeoffs that comes
// with (mainly: tests require the dev server + dev tenants to exist).

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3001/api/v1';

async function login(tenantDomain, username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-domain': tenantDomain },
    body: JSON.stringify({ username, password })
  });
  const body = await res.json();
  return { status: res.status, body };
}

// The login rate limiter (10 attempts/15min per tenant+IP — see
// server/middleware/rateLimiters.js) applies here just like it would to a
// real client. Every test file logging in independently for every test
// would trip it well within a single suite run, so successful logins are
// cached per (tenant, username) for the life of the process — tests only
// pay the real rate-limit cost once per identity, not once per assertion.
const tokenCache = new Map();

async function getToken(tenantDomain, username, password) {
  const cacheKey = `${tenantDomain}:${username}`;
  if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey);

  const { status, body } = await login(tenantDomain, username, password);
  if (status !== 200) {
    throw new Error(`getToken(${tenantDomain}, ${username}) failed: ${status} ${body.error || ''}`);
  }
  tokenCache.set(cacheKey, body.data.token);
  return body.data.token;
}

async function apiRequest(tenantDomain, token, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': tenantDomain,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const contentType = res.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json') ? await res.json() : null;
  return { status: res.status, body: responseBody };
}

module.exports = { login, getToken, apiRequest, BASE_URL };
