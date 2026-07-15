// Row-level self-scoping for the `guardian` role — resolves the linked
// learner ids for the caller's own onec_guardians row, via
// onec_learner_guardian_map. Returns null if the caller isn't a guardian
// (no scoping applies to them here), or an array (possibly empty, if no
// children are linked yet) of learner ids otherwise.
async function getOwnGuardianLearnerIds(req) {
  if (req.user?.role !== 'guardian') return null;

  const guardianResult = await req.db.query('SELECT id FROM onec_guardians WHERE user_id = $1', [req.user.userId]);
  const guardianId = guardianResult.rows[0]?.id;
  if (!guardianId) return [];

  const linksResult = await req.db.query(
    'SELECT learner_id FROM onec_learner_guardian_map WHERE guardian_id = $1',
    [guardianId]
  );
  return linksResult.rows.map((row) => row.learner_id);
}

module.exports = { getOwnGuardianLearnerIds };
