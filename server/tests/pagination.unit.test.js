// A pure unit test — no server, no DB — unlike the rest of tests/, which are
// integration tests against a real running server (see tests/README.md).
// parsePagination() has no side effects, so it's worth testing directly.
const { parsePagination } = require('../lib/pagination');

describe('parsePagination', () => {
  test('returns pagination: null when neither page nor pageSize is present (backward compatible)', () => {
    const { pagination, error } = parsePagination({});
    expect(pagination).toBeNull();
    expect(error).toBeNull();
  });

  test('ignores unrelated query params', () => {
    const { pagination } = parsePagination({ cohort_id: '5', date: '2026-01-01' });
    expect(pagination).toBeNull();
  });

  test('defaults page to 1 and pageSize to 50 when only one is given', () => {
    const { pagination } = parsePagination({ page: '2' });
    expect(pagination).toEqual({ page: 2, pageSize: 50, limit: 50, offset: 50 });
  });

  test('computes limit/offset correctly for an explicit page and pageSize', () => {
    const { pagination } = parsePagination({ page: '3', pageSize: '20' });
    expect(pagination).toEqual({ page: 3, pageSize: 20, limit: 20, offset: 40 });
  });

  test('page 1 has offset 0', () => {
    const { pagination } = parsePagination({ page: '1', pageSize: '10' });
    expect(pagination.offset).toBe(0);
  });

  test('rejects a pageSize above the 200 cap', () => {
    const { pagination, error } = parsePagination({ pageSize: '500' });
    expect(pagination).toBeNull();
    expect(error).toBeTruthy();
  });

  test('rejects page 0 and negative page numbers', () => {
    expect(parsePagination({ page: '0' }).error).toBeTruthy();
    expect(parsePagination({ page: '-1' }).error).toBeTruthy();
  });

  test('rejects a non-numeric page', () => {
    const { pagination, error } = parsePagination({ page: 'abc' });
    expect(pagination).toBeNull();
    expect(error).toBeTruthy();
  });
});
