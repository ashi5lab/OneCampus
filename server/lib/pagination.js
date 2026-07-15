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

module.exports = { parsePagination };
