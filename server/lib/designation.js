// 'principal'/'vice_principal' are not roles — they're an optional tag
// (meta.designation) an admin can put on any instructor or staff row (see
// server/modules/instructors and server/modules/staff's setDesignation).
// This resolves the caller's own tag, used to widen a leave-approval queue
// (server/modules/leave) to the whole tenant, and to gate who may name the
// school head (server/modules/learners).
async function getCallerDesignation(req) {
  const role = req.user?.role;
  if (role !== 'instructor' && role !== 'staff') return null;

  const table = role === 'instructor' ? 'onec_instructors' : 'onec_staff';
  const result = await req.db.query(`SELECT meta FROM ${table} WHERE user_id = $1`, [req.user.userId]);
  return result.rows[0]?.meta?.designation || null;
}

// Assigns (or clears) 'principal'/'vice_principal' on one row of `table`
// ('onec_instructors' or 'onec_staff'). Each designation is single-holder
// tenant-wide, across BOTH tables — either an instructor or a staff member
// can be principal, so setting it here first clears it from wherever it
// currently sits (which may be the other table) before assigning it to the
// new holder. Returns the updated row, or null if `id` doesn't exist in
// `table`.
async function assignDesignation(req, table, id, designation) {
  await req.db.query('BEGIN');
  try {
    if (designation) {
      await req.db.query(`UPDATE onec_instructors SET meta = meta - 'designation' WHERE meta->>'designation' = $1`, [designation]);
      await req.db.query(`UPDATE onec_staff SET meta = meta - 'designation' WHERE meta->>'designation' = $1`, [designation]);
    }

    const result = await req.db.query(
      `UPDATE ${table}
       SET meta = CASE WHEN $1::text IS NULL THEN meta - 'designation' ELSE jsonb_set(meta, '{designation}', to_jsonb($1::text)) END
       WHERE id = $2 RETURNING *`,
      [designation, id]
    );
    await req.db.query('COMMIT');
    return result.rows[0] || null;
  } catch (err) {
    await req.db.query('ROLLBACK');
    throw err;
  }
}

module.exports = { getCallerDesignation, assignDesignation };
