// Separate from apiClient.js on purpose: super admin calls hit
// /api/v1/platform routes, need no tenant header, and authenticate with a
// plain Bearer JWT (no httpOnly refresh-token cookie/CSRF dance — see
// server/modules/platform/README.md for why that's an intentional
// simplification for now).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const TOKEN_STORAGE_KEY = 'onecampus.superAdminToken';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function setSuperAdminToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getSuperAdminToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getSuperAdminToken();
  const res = await fetch(`${BASE_URL}/platform${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
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

export const superAdminApiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' })
};
