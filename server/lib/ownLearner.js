// Row-level self-scoping for the `learner` role (spec Part 7's permission
// system is role-level only — "learners.view"-style checks don't stop a
// learner from seeing every OTHER learner's attendance/scores/certificates,
// only from touching the roster-management screens). Used by list endpoints
// that a learner has .view access to, so their results narrow to "my own
// records" instead of "every record in the tenant".
//
// Guardian scoping is handled separately in lib/ownGuardianLearners.js —
// controllers should use lib/rowScope.js's getScopedLearnerIds(req), which
// combines both, rather than calling this directly.
async function getOwnLearnerId(req) {
  if (req.user?.role !== 'learner') return null;
  const result = await req.db.query('SELECT id FROM onec_learners WHERE user_id = $1', [req.user.userId]);
  return result.rows[0]?.id ?? null;
}

module.exports = { getOwnLearnerId };
