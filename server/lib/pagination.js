const { z } = require('zod');

// Capped at 200 so a client can't force an unbounded-size page — 50 is a
// reasonable default list-page size for the roster-style UIs these back.
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional()
});

// Opt-in, backward-compatible pagination: a request with neither ?page= nor
// ?pageSize= gets `pagination: null` back, meaning "return every row",
// exactly the behavior every list endpoint had before this existed — no
// existing frontend caller (which expects `data` to already be the full
// array) breaks. Only once a caller actually asks for a page does the
// response shape gain a `meta: {total, page, pageSize}` alongside `data`.
function parsePagination(query) {
  if (query.page === undefined && query.pageSize === undefined) {
    return { pagination: null, error: null };
  }

  const parsed = paginationQuerySchema.safeParse(query);
  if (!parsed.success) {
    return { pagination: null, error: parsed.error.format() };
  }

  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 50;
  return { pagination: { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize }, error: null };
}

// Resolves a client-requested `?sort=`/`?order=` pair into a ready-to-use
// SQL ORDER BY clause, via a per-endpoint whitelist (`sortMap`: public sort
// key -> literal SQL column expression chosen by the server). The client's
// `sort` value is only ever used as a lookup key into that whitelist —
// never concatenated into the query — so this is safe against SQL
// injection even though the result is spliced directly into a query
// string. Falls back to `defaultOrderBy` (the endpoint's pre-existing
// hardcoded ORDER BY, e.g. 'l.id DESC') when `sort` is absent or not in
// the whitelist, so every DataTable-driven list keeps its previous default
// ordering until a caller actually clicks a sortable column header.
function resolveSort(query, sortMap, defaultOrderBy) {
  const key = query.sort;
  if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(sortMap, key)) {
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    return `${sortMap[key]} ${order}`;
  }
  return defaultOrderBy;
}

module.exports = { parsePagination, resolveSort };
