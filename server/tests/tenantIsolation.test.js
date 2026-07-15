const { login, getToken, apiRequest } = require('./helpers');

const DEV = 'dev.onecampus.local';
const DEV2 = 'dev2.onecampus.local';

describe('Tenant isolation', () => {
  test('login fails with a clear error for wrong credentials', async () => {
    const { status, body } = await login(DEV, 'test_admin', 'definitely-wrong-password');
    expect(status).toBe(401);
    expect(body.error).toBeTruthy();
  });

  test('a JWT minted for one tenant is rejected when replayed against a different tenant', async () => {
    const token = await getToken(DEV, 'test_admin', 'password123');

    // Same valid token, wrong tenant header — must not be treated as authenticated there.
    const { status } = await apiRequest(DEV2, token, 'GET', '/learners');
    expect(status).toBe(401);
  });

  test('a request with no tenant-scoping match returns 404, not a silent cross-tenant fallback', async () => {
    const { status } = await apiRequest('nonexistent.onecampus.local', null, 'GET', '/tenant/config');
    expect(status).toBe(404);
  });

  test('data created in one tenant is not visible from a different tenant', async () => {
    const dev2Token = await getToken(DEV2, 'test_admin', 'password123');

    const before = await apiRequest(DEV2, dev2Token, 'GET', '/units');
    const beforeCount = before.body.data.length;

    const created = await apiRequest(DEV2, dev2Token, 'POST', '/units', {
      name: 'Isolation Test Unit',
      type: 'test'
    });
    expect(created.status).toBe(201);

    const after = await apiRequest(DEV2, dev2Token, 'GET', '/units');
    expect(after.body.data.length).toBe(beforeCount + 1);

    // The unit created in dev2 must not leak into dev's tenant-scoped data.
    const devToken = await getToken(DEV, 'test_admin', 'password123');
    const devUnits = await apiRequest(DEV, devToken, 'GET', '/units');
    const leaked = devUnits.body.data.some((u) => u.name === 'Isolation Test Unit');
    expect(leaked).toBe(false);
  });
});
