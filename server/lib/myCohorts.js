// Resolves which cohorts (classes) the caller belongs to for the "Class"
// tab — a learner's own single class, or every class an instructor advises
// (onec_cohorts.advisor_id) or co-teaches (onec_instructor_cohorts). Staff
// and admin have no cohort-membership relationship in the schema, so they
// always get an empty list here; their Class tab shows an empty state
// rather than a picker.
async function getMyCohorts(req) {
  const role = req.user?.role;

  if (role === 'learner') {
    const result = await req.db.query(
      `SELECT c.id, c.name, c.time_block,
              (SELECT COUNT(*) FROM onec_learners l2 WHERE l2.cohort_id = c.id AND l2.status = 'active') AS learner_count,
              adv.first_name AS advisor_first_name, adv.last_name AS advisor_last_name
       FROM onec_cohorts c
       JOIN onec_learners l ON l.cohort_id = c.id
       LEFT JOIN onec_instructors adv ON adv.user_id = c.advisor_id
       WHERE l.user_id = $1`,
      [req.user.userId]
    );
    return result.rows;
  }

  if (role === 'instructor') {
    const result = await req.db.query(
      `SELECT DISTINCT c.id, c.name, c.time_block,
              (SELECT COUNT(*) FROM onec_learners l2 WHERE l2.cohort_id = c.id AND l2.status = 'active') AS learner_count,
              adv.first_name AS advisor_first_name, adv.last_name AS advisor_last_name,
              (c.advisor_id = $1) AS is_advisor
       FROM onec_cohorts c
       LEFT JOIN onec_instructors adv ON adv.user_id = c.advisor_id
       WHERE c.advisor_id = $1
          OR c.id IN (
            SELECT ic.cohort_id FROM onec_instructor_cohorts ic
            JOIN onec_instructors i ON ic.instructor_id = i.id
            WHERE i.user_id = $1
          )
       ORDER BY c.name`,
      [req.user.userId]
    );
    return result.rows;
  }

  return [];
}

module.exports = { getMyCohorts };
