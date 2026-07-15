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

// Node's native fetch has no automatic cookie jar the way a browser does —
// needed for testing the refresh/logout flow, which relies entirely on the
// httpOnly refreshToken + readable csrfToken cookies (see
// server/lib/authCookies.js), not a Bearer token. res.headers.getSetCookie()
// (Node 20+'s undici) is what makes this practical: a plain
// res.headers.get('set-cookie') would incorrectly join multiple Set-Cookie
// headers (refreshToken + csrfToken) into one string.
function extractCookies(res) {
  const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookies = {};
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const eqIdx = pair.indexOf('=');
    cookies[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
  }
  return cookies;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// Not routed through getToken's cache — that only stores the access token,
// not the cookies the refresh flow itself needs to test.
async function loginWithCookies(tenantDomain, username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-domain': tenantDomain },
    body: JSON.stringify({ username, password })
  });
  const body = await res.json();
  return { status: res.status, body, cookies: extractCookies(res) };
}

// `csrfTokenOverride` lets a test deliberately send a missing/wrong CSRF
// header without needing a second set of cookies — pass '' to omit the
// header entirely, or any string to send that exact value instead of the
// cookie's real one.
async function refreshWithCookies(tenantDomain, cookies, csrfTokenOverride) {
  const csrfToken = csrfTokenOverride === undefined ? cookies.csrfToken : csrfTokenOverride;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': tenantDomain,
      Cookie: cookieHeader(cookies),
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
    }
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, cookies: extractCookies(res) };
}

async function logoutWithCookies(tenantDomain, cookies) {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-domain': tenantDomain,
      Cookie: cookieHeader(cookies),
      'x-csrf-token': cookies.csrfToken
    }
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

module.exports = {
  login,
  getToken,
  apiRequest,
  loginWithCookies,
  refreshWithCookies,
  logoutWithCookies,
  BASE_URL
};
