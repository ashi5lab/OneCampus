const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_DOMAIN = import.meta.env.VITE_TENANT_DOMAIN;

let authToken = null;

// AuthContext calls this after login/logout so every subsequent request
// carries (or drops) the bearer token, without every call site having to
// know where the token lives.
export function setAuthToken(token) {
  authToken = token;
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Every network call in the app goes through this — no fetch/axios directly
// from components — so base URL, tenant header, auth header, and error
// shape normalization all live in one place.
async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TENANT_DOMAIN ? { 'x-tenant-domain': TENANT_DOMAIN } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(payload?.error || res.statusText, res.status, payload?.details);
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' })
};
