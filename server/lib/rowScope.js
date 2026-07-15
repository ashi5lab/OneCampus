const { getOwnLearnerId } = require('./ownLearner');
const { getOwnGuardianLearnerIds } = require('./ownGuardianLearners');

// Combines the two row-level self-scoping resolvers into the one thing a
// controller actually needs: the set of learner_ids this caller's role
// should be restricted to, or null if no scoping applies (admin/staff/
// instructor see everything). A learner is scoped to exactly their own id
// (a 1-element array); a guardian to their linked children's ids (any
// length, including 0 if none are linked yet — see
// server/modules/guardianLinks).
async function getScopedLearnerIds(req) {
  const ownLearnerId = await getOwnLearnerId(req);
  if (ownLearnerId !== null) return [ownLearnerId];

  const guardianLearnerIds = await getOwnGuardianLearnerIds(req);
  if (guardianLearnerIds !== null) return guardianLearnerIds;

  return null;
}

module.exports = { getScopedLearnerIds };
