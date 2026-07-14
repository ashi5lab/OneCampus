// Fire-and-forget audit log write (spec Part 11: "audit log table for
// sensitive actions — grading changes, certificate issuance, role changes").
// Failure to log must never fail the request it's logging, so errors are
// caught and only console.error'd, never thrown.
async function logAudit(req, action, details = {}) {
  try {
    await req.db.query(
      'INSERT INTO onec_audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user?.userId ?? null, action, details]
    );
  } catch (err) {
    console.error('Failed to write audit log:', action, err.message);
  }
}

module.exports = { logAudit };
