const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const ENV_TENANT_DOMAIN = import.meta.env.VITE_TENANT_DOMAIN;
const TENANT_DOMAIN_STORAGE_KEY = 'onecampus.tenantDomain';

let authToken = null;
let refreshPromise = null; // de-dupes concurrent refresh attempts (see refreshAccessToken)

// AuthContext calls this after login/refresh so every subsequent request
// carries the right credentials, without every call site having to know
// where it lives.
export function setAuthToken(token) {
  authToken = token;
}

// A tenant typed into the login/register form at runtime — this app is one
// build serving every tenant (unlike VITE_TENANT_DOMAIN, which is baked in
// at build time for single-tenant local dev). Persisted so a page reload on
// the tenant login/app routes still targets the right tenant. Real
// production deployments that route tenants by Host header don't need this
// at all; it's only consulted as a fallback.
export function setTenantDomain(domain) {
  if (domain) localStorage.setItem(TENANT_DOMAIN_STORAGE_KEY, domain);
  else localStorage.removeItem(TENANT_DOMAIN_STORAGE_KEY);
}

export function getTenantDomain() {
  return localStorage.getItem(TENANT_DOMAIN_STORAGE_KEY) || ENV_TENANT_DOMAIN || '';
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function tenantHeaders() {
  const domain = getTenantDomain();
  return domain ? { 'x-tenant-domain': domain } : {};
}

// The csrfToken cookie is deliberately not httpOnly (see server/lib/
// authCookies.js) specifically so this can read it — it must NOT be cached
// in a JS variable, because a page reload resets JS module state but the
// cookie itself survives, so a cached value would go stale on every reload
// (this was a real bug: the very first refresh-on-mount call always failed
// because the cached token was still null).
function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// Exchanges the httpOnly refresh-token cookie for a new access token.
// Concurrent callers (e.g. several React Query hooks whose access token
// all expired around the same moment) share one in-flight request instead
// of each racing to rotate the single-use refresh token — only the first
// would succeed, the rest would see it as already-used and fail.
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders(), 'x-csrf-token': readCsrfCookie() }
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new ApiError(payload?.error || 'Session expired', res.status);
        authToken = payload.data.token;
        return payload.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function logoutRequest() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...tenantHeaders(), 'x-csrf-token': readCsrfCookie() }
    });
  } finally {
    // Best-effort: clear local credentials even if the network call fails —
    // the user's intent to log out shouldn't be blocked by connectivity.
    authToken = null;
  }
}

// Every network call in the app goes through this — no fetch/axios directly
// from components — so base URL, tenant header, auth header, and error
// shape normalization all live in one place.
async function request(path, { method = 'GET', body, headers, _retried = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...tenantHeaders(),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    // A 401 on /auth/login itself means bad credentials, not an expired
    // access token — never try to "refresh" our way out of that.
    const canRetry = res.status === 401 && !_retried && path !== '/auth/login';
    if (canRetry) {
      try {
        await refreshAccessToken();
        return request(path, { method, body, headers, _retried: true });
      } catch {
        // Refresh itself failed (no valid session) — fall through and
        // surface the original 401 so the caller can redirect to login.
      }
    }
    throw new ApiError(payload?.error || res.statusText, res.status, payload?.details);
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' })
};

// Separate from request() because a binary (PDF) response can't go through
// res.json() — mirrors request()'s auth header + one-shot 401-refresh-retry
// logic, then triggers a browser download instead of returning parsed data.
export async function downloadFile(path, filename, _retried = false) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...tenantHeaders(),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });

  if (!res.ok) {
    if (res.status === 401 && !_retried) {
      try {
        await refreshAccessToken();
        return downloadFile(path, filename, true);
      } catch {
        // Refresh failed too — fall through to surface the original 401.
      }
    }
    const payload = await res.json().catch(() => null);
    throw new ApiError(payload?.error || res.statusText, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Separate from request() for the same reason downloadFile is: a
// multipart/form-data body can't go through JSON.stringify, and — just as
// important — must NOT set a 'Content-Type' header manually, since the
// browser needs to add its own boundary parameter to it. Mirrors request()'s
// auth/tenant headers and one-shot 401-refresh-retry logic.
export async function uploadFile(path, formData, { method = 'POST', _retried = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...tenantHeaders(),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: formData
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401 && !_retried) {
      try {
        await refreshAccessToken();
        return uploadFile(path, formData, { method, _retried: true });
      } catch {
        // Refresh failed too — fall through to surface the original 401.
      }
    }
    throw new ApiError(payload?.error || res.statusText, res.status, payload?.details);
  }

  return payload;
}
