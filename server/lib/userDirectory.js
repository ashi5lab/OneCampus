// Shared "every user, with a display name" query — backs every
// UserSearchSelect picker in the frontend (access groups, library
// borrowers, message recipients, broadcast audience, cohort class-teacher,
// admin password reset). onec_users itself only has username/role; the
// actual first/last name lives in whichever per-role table applies
// (instructor/staff/learner/guardian — admin has none, so `name` is null
// for admins and the frontend falls back to username).
async function listUsersWithNames(req, { excludeUserId, includeInactive = false } = {}) {
  const params = [];
  const conditions = includeInactive ? [] : ['u.is_active = true'];
  if (excludeUserId) {
    params.push(excludeUserId);
    conditions.push(`u.id != $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await req.db.query(
    `SELECT u.id, u.username, u.email, u.role, u.is_active,
            COALESCE(i.first_name || ' ' || i.last_name, s.first_name || ' ' || s.last_name,
                     l.first_name || ' ' || l.last_name, g.first_name || ' ' || g.last_name) AS name
     FROM onec_users u
     LEFT JOIN onec_instructors i ON i.user_id = u.id AND u.role = 'instructor'
     LEFT JOIN onec_staff s ON s.user_id = u.id AND u.role = 'staff'
     LEFT JOIN onec_learners l ON l.user_id = u.id AND u.role = 'learner'
     LEFT JOIN onec_guardians g ON g.user_id = u.id AND u.role = 'guardian'
     ${whereClause}
     ORDER BY u.role, u.username`,
    params
  );
  return result.rows;
}

// Back-compat name for the active-only, no-inactive-column-noise call
// shape most callers use.
const listActiveUsers = (req, opts) => listUsersWithNames(req, opts);

module.exports = { listActiveUsers, listUsersWithNames };
