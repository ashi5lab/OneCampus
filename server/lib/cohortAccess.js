const { getMyCohorts } = require('./myCohorts');

// Whether the caller may view/post in this cohort's class channel.
// admin/staff already have tenant-wide messaging reach (messages.view/.send
// are granted to every role), so they may access any cohort's channel;
// everyone else must actually belong to it — own class for a learner,
// advised/co-taught for an instructor (see getMyCohorts).
async function canAccessCohort(req, cohortId) {
  const role = req.user?.role;
  if (role === 'admin' || role === 'staff') return true;

  const mine = await getMyCohorts(req);
  return mine.some((c) => c.id === Number(cohortId));
}

// Moderation powers within a class channel — pinning, deleting someone
// else's message, and viewing edit history — are anyone who isn't a
// learner, scoped to a class they actually belong to. A learner can only
// ever moderate their own messages (enforced separately by an author check
// at the call site), never anyone else's.
async function canModerateCohort(req, cohortId) {
  const role = req.user?.role;
  if (role === 'learner') return false;
  return canAccessCohort(req, cohortId);
}

module.exports = { canAccessCohort, canModerateCohort };
