// Row-level self-scoping for the `learner` role (spec Part 7's permission
// system is role-level only — "learners.view"-style checks don't stop a
// learner from seeing every OTHER learner's attendance/scores/certificates,
// only from touching the roster-management screens). Used by list endpoints
// that a learner has .view access to, so their results narrow to "my own
// records" instead of "every record in the tenant".
//
// Guardian scoping is deliberately NOT handled here — it depends on
// onec_learner_guardian_map, which has no backend/frontend to populate it
// yet (see HANDOFF.md). Scoping guardians to "nothing" wouldn't be
// meaningfully better than today's unscoped access, and building the
// linking feature is a separate, larger piece of work.
async function getOwnLearnerId(req) {
  if (req.user?.role !== 'learner') return null;
  const result = await req.db.query('SELECT id FROM onec_learners WHERE user_id = $1', [req.user.userId]);
  return result.rows[0]?.id ?? null;
}

module.exports = { getOwnLearnerId };
