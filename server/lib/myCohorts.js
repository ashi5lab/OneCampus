// Resolves which cohorts (classes) the caller belongs to for the "Class"
// tab — a learner's own single class, or every class an instructor advises
// (onec_cohorts.advisor_id) or co-teaches (onec_instructor_cohorts). Staff
// and admin have no cohort-membership relationship in the schema, so they
// always get an empty list here; their Class tab shows an empty state
// rather than a picker.
async function getMyCohorts(req) {
  const role = req.user?.role;

  // attendance_rate_30d feeds the class cards' "% attendance" chip —
  // class-wide, last 30 days, null when nothing's been marked yet so the
  // chip can simply not render instead of showing a misleading 0%.
  const attendanceRateSql = `
    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(*), 0))
       FROM onec_attendance a
      WHERE a.cohort_id = c.id AND a.date >= CURRENT_DATE - 30) AS attendance_rate_30d`;

  if (role === 'learner') {
    const result = await req.db.query(
      `SELECT c.id, c.name, c.time_block,
              (SELECT COUNT(*) FROM onec_learners l2 WHERE l2.cohort_id = c.id AND l2.status = 'active') AS learner_count,
              adv.first_name AS advisor_first_name, adv.last_name AS advisor_last_name,
              ${attendanceRateSql}
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
              (c.advisor_id = $1) AS is_advisor,
              ${attendanceRateSql},
              (SELECT COUNT(*) FROM onec_assignment_submissions s
                 JOIN onec_assignments asg ON asg.id = s.assignment_id
                WHERE asg.cohort_id = c.id AND s.score_obtained IS NULL) AS to_grade
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
