const { getToken, apiRequest } = require('./helpers');

const TENANT = 'dev.onecampus.local';

describe('Permission gating', () => {
  let adminToken, instructorToken, learnerToken;

  beforeAll(async () => {
    adminToken = await getToken(TENANT, 'test_admin', 'password123');
    instructorToken = await getToken(TENANT, 'ui_test_teacher', 'uitestpass2');
    learnerToken = await getToken(TENANT, 'ui_test_student', 'uitestpass');
  });

  test('GET /auth/me returns the correct permission set per role', async () => {
    const adminMe = await apiRequest(TENANT, adminToken, 'GET', '/auth/me');
    expect(adminMe.body.data.role).toBe('admin');
    expect(adminMe.body.data.permissions).toContain('learners.manage');

    const learnerMe = await apiRequest(TENANT, learnerToken, 'GET', '/auth/me');
    expect(learnerMe.body.data.role).toBe('learner');
    expect(learnerMe.body.data.permissions).not.toContain('learners.view');
    expect(learnerMe.body.data.permissions).toContain('attendance.view');
  });

  test('admin can list and manage learners', async () => {
    const list = await apiRequest(TENANT, adminToken, 'GET', '/learners');
    expect(list.status).toBe(200);

    // A delete against a nonexistent id should get past the permission
    // check (200/404), not be blocked by it (403) — proves admin has
    // learners.manage without depending on real data to delete.
    const del = await apiRequest(TENANT, adminToken, 'DELETE', '/learners/999999');
    expect(del.status).toBe(404);
  });

  test('instructor can view the roster but cannot manage instructors', async () => {
    const list = await apiRequest(TENANT, instructorToken, 'GET', '/learners');
    expect(list.status).toBe(200);

    const del = await apiRequest(TENANT, instructorToken, 'DELETE', '/instructors/999999');
    expect(del.status).toBe(403);
    expect(del.body.error).toMatch(/instructors\.manage/);
  });

  test('instructor can mark attendance', async () => {
    // Deliberately invalid FK data — we only care that the permission
    // check passes (not 403), the request can still fail downstream (400).
    const { status } = await apiRequest(TENANT, instructorToken, 'POST', '/attendance', {
      learner_id: 999999,
      cohort_id: 999999,
      date: '2026-01-01',
      status: 'present'
    });
    expect(status).not.toBe(403);
  });

  test('learner cannot list learners (no learners.view)', async () => {
    const { status, body } = await apiRequest(TENANT, learnerToken, 'GET', '/learners');
    expect(status).toBe(403);
    expect(body.error).toMatch(/learners\.view/);
  });

  test('learner can view attendance but cannot mark it', async () => {
    const view = await apiRequest(TENANT, learnerToken, 'GET', '/attendance');
    expect(view.status).toBe(200);

    const mark = await apiRequest(TENANT, learnerToken, 'POST', '/attendance', {
      learner_id: 1,
      cohort_id: 1,
      date: '2026-01-01',
      status: 'present'
    });
    expect(mark.status).toBe(403);
  });

  test('a request with no token is rejected before any permission check runs', async () => {
    const { status } = await apiRequest(TENANT, null, 'GET', '/learners');
    expect(status).toBe(401);
  });
});
