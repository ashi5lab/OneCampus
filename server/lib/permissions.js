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
  'evaluations.view', 'evaluations.manage', 'evaluations.grade'
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  staff: ALL_PERMISSIONS,
  instructor: [
    'units.view', 'cohorts.view', 'modules.view', 'instructors.view',
    'learners.view', 'guardians.view',
    'attendance.view', 'attendance.mark',
    'evaluations.view', 'evaluations.manage', 'evaluations.grade'
  ],
  // Coarse-grained on purpose (see the row-level-scoping note above) — kept
  // to just enough to view attendance/evaluation records, not the full
  // roster/management surface.
  learner: ['attendance.view', 'evaluations.view'],
  guardian: ['attendance.view', 'evaluations.view']
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

module.exports = {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  seedDefaultPermissions,
  hasPermission,
  can: hasPermission,
  cannot
};
