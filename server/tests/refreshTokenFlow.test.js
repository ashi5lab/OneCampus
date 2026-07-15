const { loginWithCookies, refreshWithCookies, logoutWithCookies } = require('./helpers');

const TENANT = 'dev.onecampus.local';

// Covers the refresh/rotation flow itself (spec §11 baseline) — previously
// only verified manually via curl -c/-b and in-browser (see HANDOFF.md).
// Tests within this describe block are intentionally sequential and share
// state: each one both asserts on the current cookie pair *and* produces
// the next one, mirroring how a real client's session evolves across
// repeated silent refreshes. Don't reorder them.
describe('Refresh token rotation flow', () => {
  let cookies;

  beforeAll(async () => {
    const { status, body, cookies: loginCookies } = await loginWithCookies(TENANT, 'test_admin', 'password123');
    expect(status).toBe(200);
    expect(loginCookies.refreshToken).toBeTruthy();
    expect(loginCookies.csrfToken).toBeTruthy();
    expect(loginCookies.csrfToken).toBe(body.data.csrfToken);
    cookies = loginCookies;
  });

  test('refresh exchanges a valid refresh cookie for a new access token and rotates the refresh token', async () => {
    const result = await refreshWithCookies(TENANT, cookies);

    expect(result.status).toBe(200);
    expect(result.body.data.token).toBeTruthy();
    expect(result.body.data.user.username).toBe('test_admin');
    // Rotation means a brand new refresh token, not the same one echoed back.
    expect(result.cookies.refreshToken).toBeTruthy();
    expect(result.cookies.refreshToken).not.toBe(cookies.refreshToken);
    expect(result.cookies.csrfToken).not.toBe(cookies.csrfToken);

    cookies = result.cookies;
  });

  test('replaying an already-rotated-out refresh token fails', async () => {
    // `cookies` now holds the pair issued by the previous test's refresh
    // call — refresh again to rotate once more, then try the *previous*
    // (now stale) pair to prove single-use.
    const staleCookies = cookies;
    const rotated = await refreshWithCookies(TENANT, staleCookies);
    expect(rotated.status).toBe(200);
    cookies = rotated.cookies;

    const replay = await refreshWithCookies(TENANT, staleCookies);
    expect(replay.status).toBe(401);
  });

  test('refresh is rejected without the matching CSRF header', async () => {
    const missingCsrf = await refreshWithCookies(TENANT, cookies, '');
    expect(missingCsrf.status).toBe(403);

    const wrongCsrf = await refreshWithCookies(TENANT, cookies, 'not-the-real-token');
    expect(wrongCsrf.status).toBe(403);
  });

  test('refresh is rejected with no refresh cookie at all', async () => {
    const result = await refreshWithCookies(TENANT, { csrfToken: cookies.csrfToken }, cookies.csrfToken);
    expect(result.status).toBe(401);
  });

  test('logout revokes the current refresh token', async () => {
    const logoutResult = await logoutWithCookies(TENANT, cookies);
    expect(logoutResult.status).toBe(200);
    expect(logoutResult.body.data.loggedOut).toBe(true);

    const afterLogout = await refreshWithCookies(TENANT, cookies);
    expect(afterLogout.status).toBe(401);
  });
});
