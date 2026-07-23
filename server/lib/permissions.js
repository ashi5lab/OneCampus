// Phase 7 permissions system (spec Part 7). onec_role_permissions is an
// allow-list: a (role, permission) row means that role has that permission
// for this tenant. Tenant admins can add/remove rows to customize a role's
// access without a code change — DEFAULT_ROLE_PERMISSIONS below is only the
// seed data used at provisioning time, not a hardcoded source of truth.
//
// Known limitation: this is role-level, not row-level. Granting a role
// "learners.view" lets it list every learner tenant-wide — there's no
// per-record scoping (e.g. "a learner can only see their own record") yet.
// That's a separate, larger piece of work; don't assume this closes it.

const ALL_PERMISSIONS = [
  'units.view', 'units.manage',
  'cohorts.view', 'cohorts.manage',
  'modules.view', 'modules.manage',
  'instructors.view', 'instructors.manage',
  'learners.view', 'learners.manage',
  'guardians.view', 'guardians.manage',
  'attendance.view', 'attendance.mark',
  'evaluations.view', 'evaluations.manage', 'evaluations.grade',
  'certificates.view', 'certificates.issue',
  'kindergarten_activity.view', 'kindergarten_activity.log',
  'guardian_links.view', 'guardian_links.manage',
  'messages.view', 'messages.send',
  'notices.view', 'notices.manage',
  'library.view', 'library.manage',
  'assignments.view', 'assignments.manage', 'assignments.grade', 'assignments.submit',
  'online_exams.view', 'online_exams.manage', 'online_exams.grade', 'online_exams.take',
  'reports.view',
  'users.manage_passwords',
  'broadcast.view', 'broadcast.manage', 'broadcast.approve', 'broadcast.configure',
  'staff.view', 'staff.manage',
  'access_control.manage',
  'leave.apply', 'leave.view_own', 'leave.approve',
  'calendar.view', 'calendar.manage',
  'timetable.view', 'timetable.manage',
  'bulk_upload.manage',
  'staff_attendance.view', 'staff_attendance.mark', 'staff_attendance.view_own',
  'discipline.view', 'discipline.log',
  'id_cards.generate',
  'ptm.view', 'ptm.manage', 'ptm.book',
  'visitors.view', 'visitors.log',
  'instructor_modules.view', 'instructor_modules.manage',
  'instructor_cohorts.view', 'instructor_cohorts.manage',
  'class.view'
];

// messages.view/.send are granted to every role below — unlike the
// roster-style permissions above, there's no "manage vs. view" split for
// messaging: everyone can see their own inbox and send a message, the same
// way every role can already see their own attendance/scores. There's
// nothing to self-scope by learner_id here either (a message is already
// inherently "mine" — sender_id/recipient_id = the caller), so this is the
// one permission pair with no row-scoping concern at all.
const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  staff: ['calendar.view', 'notices.view'],
  instructor: ['calendar.view', 'notices.view'],
  learner: ['calendar.view', 'notices.view'],
  guardian: ['calendar.view', 'notices.view']
};

async function seedDefaultPermissions(client) {
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      await client.query(
        'INSERT INTO onec_role_permissions (role, permission) VALUES ($1, $2) ON CONFLICT (role, permission) DO NOTHING',
        [role, permission]
      );
    }
  }
}

// A caller's effective permissions are their role's onec_role_permissions
// rows UNION every Access Control group that applies to them (see
// server/modules/accessControl) — either a group targeting their whole role,
// or one targeting them individually/as part of an explicit set of users.
// This query references onec_access_groups/onec_access_group_members,
// which won't exist on a tenant that hasn't yet run migration 015 — rather
// than 500ing on every single permission check tenant-wide the moment this
// code deploys ahead of that migration, PG error 42P01 (undefined_table)
// falls back to the plain role-only query, so the rest of the app keeps
// working and only the not-yet-migrated Access Control feature is absent.
const EFFECTIVE_PERMISSIONS_QUERY = `
  SELECT permission FROM onec_role_permissions WHERE role = $1
  UNION
  SELECT jsonb_array_elements_text(g.permissions) AS permission
  FROM onec_access_groups g
  WHERE (g.target_type = 'role' AND g.target_role = $1)
     OR (g.target_type = 'users' AND g.id IN (
           SELECT group_id FROM onec_access_group_members WHERE user_id = $2
         ))
`;

function isUndefinedTableError(err) {
  return err.code === '42P01';
}

// req.db is already pinned to the tenant's schema (see middleware/tenantDb.js).
async function hasPermission(req, permission) {
  const role = req.user?.role;
  if (!role) return false;

  try {
    const result = await req.db.query(`SELECT 1 FROM (${EFFECTIVE_PERMISSIONS_QUERY}) p WHERE permission = $3 LIMIT 1`, [
      role,
      req.user.userId,
      permission
    ]);
    return result.rows.length > 0;
  } catch (err) {
    if (!isUndefinedTableError(err)) throw err;
    const fallback = await req.db.query('SELECT 1 FROM onec_role_permissions WHERE role = $1 AND permission = $2 LIMIT 1', [
      role,
      permission
    ]);
    return fallback.rows.length > 0;
  }
}

async function cannot(req, permission) {
  return !(await hasPermission(req, permission));
}

// Full permission list for the caller's role — used by GET /api/v1/auth/me
// so the frontend can hide/disable what a role can't do, rather than
// hardcoding a copy of DEFAULT_ROLE_PERMISSIONS that could drift from a
// tenant's actual (possibly admin-customized) onec_role_permissions rows.
async function getPermissionsForRole(req) {
  const role = req.user?.role;
  if (!role) return [];

  try {
    const result = await req.db.query(EFFECTIVE_PERMISSIONS_QUERY, [role, req.user.userId]);
    return result.rows.map((row) => row.permission);
  } catch (err) {
    if (!isUndefinedTableError(err)) throw err;
    const fallback = await req.db.query('SELECT permission FROM onec_role_permissions WHERE role = $1', [role]);
    return fallback.rows.map((row) => row.permission);
  }
}

module.exports = {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  seedDefaultPermissions,
  hasPermission,
  can: hasPermission,
  cannot,
  getPermissionsForRole
};
