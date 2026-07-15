const { getToken, apiRequest } = require('./helpers');

const SCHOOL = 'dev.onecampus.local';
const KINDERGARTEN = 'dev3-kg.onecampus.local';

describe('Module toggle gating', () => {
  test('kindergarten tenant is blocked from /evaluations (exams module not active)', async () => {
    const token = await getToken(KINDERGARTEN, 'test_admin', 'password123');
    const { status, body } = await apiRequest(KINDERGARTEN, token, 'GET', '/evaluations');
    expect(status).toBe(403);
    expect(body.error).toMatch(/exams module/);
  });

  test('kindergarten tenant is blocked from /certificates (certificates module not active)', async () => {
    const token = await getToken(KINDERGARTEN, 'test_admin', 'password123');
    const { status, body } = await apiRequest(KINDERGARTEN, token, 'GET', '/certificates');
    expect(status).toBe(403);
    expect(body.error).toMatch(/certificates module/);
  });

  test('school tenant is blocked from /kindergarten-activity (module not active)', async () => {
    const token = await getToken(SCHOOL, 'test_admin', 'password123');
    const { status, body } = await apiRequest(SCHOOL, token, 'GET', '/kindergarten-activity');
    expect(status).toBe(403);
    expect(body.error).toMatch(/kindergarten_activity module/);
  });

  test('kindergarten tenant CAN access /kindergarten-activity', async () => {
    const token = await getToken(KINDERGARTEN, 'test_admin', 'password123');
    const { status } = await apiRequest(KINDERGARTEN, token, 'GET', '/kindergarten-activity');
    expect(status).toBe(200);
  });

  test('school tenant CAN access /certificates and /evaluations', async () => {
    const token = await getToken(SCHOOL, 'test_admin', 'password123');
    const certs = await apiRequest(SCHOOL, token, 'GET', '/certificates');
    const evals = await apiRequest(SCHOOL, token, 'GET', '/evaluations');
    expect(certs.status).toBe(200);
    expect(evals.status).toBe(200);
  });
});
