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
  'assignments.view', 'assignments.manage', 'assignments.grade', 'assignments.submit'
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
  staff: ALL_PERMISSIONS,
  instructor: [
    'units.view', 'cohorts.view', 'modules.view', 'instructors.view',
    'learners.view', 'guardians.view',
    'attendance.view', 'attendance.mark',
    'evaluations.view', 'evaluations.manage', 'evaluations.grade',
    'kindergarten_activity.view', 'kindergarten_activity.log',
    'messages.view', 'messages.send',
    'notices.view', 'library.view',
    'assignments.view', 'assignments.manage', 'assignments.grade'
  ],
  // Coarse-grained on purpose (see the row-level-scoping note above) — kept
  // to just enough to view their own records, not the full roster/management
  // surface. Certificate issuance and kindergarten activity logging are
  // staff-side actions, not granted here. Posting notices (notices.manage)
  // and managing the library catalog/loans (library.manage) are
  // admin/staff-only too, same reasoning. assignments.submit (not
  // .manage/.grade) is the learner-side counterpart of a teacher posting
  // and grading homework.
  learner: ['attendance.view', 'evaluations.view', 'certificates.view', 'kindergarten_activity.view', 'messages.view', 'messages.send', 'notices.view', 'library.view', 'assignments.view', 'assignments.submit'],
  // guardian_links.view lets a guardian look up which learners they're
  // linked to (lib/ownGuardianLearners.js needs this for row scoping) —
  // not .manage, since linking/unlinking a child is a staff-side action.
  guardian: [
    'attendance.view', 'evaluations.view', 'certificates.view', 'kindergarten_activity.view',
    'guardian_links.view', 'messages.view', 'messages.send', 'notices.view', 'library.view', 'assignments.view'
  ]
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

// req.db is already pinned to the tenant's schema (see middleware/tenantDb.js).
async function hasPermission(req, permission) {
  const role = req.user?.role;
  if (!role) return false;

  const result = await req.db.query(
    'SELECT 1 FROM onec_role_permissions WHERE role = $1 AND permission = $2 LIMIT 1',
    [role, permission]
  );
  return result.rows.length > 0;
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

  const result = await req.db.query('SELECT permission FROM onec_role_permissions WHERE role = $1', [role]);
  return result.rows.map((row) => row.permission);
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
