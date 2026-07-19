const { DEFAULT_DASHBOARD_APPS } = require('./sidebarLinks');

// Default active_modules per org_type, applied at tenant provisioning time
// (both the CLI script and the self-serve registration flow in
// server/modules/platform use this — kept in one place so they can't drift).
const DEFAULT_MODULES_BY_TYPE = {
  kindergarten: ['attendance', 'kindergarten_activity', 'messaging'],
  school: ['attendance', 'exams', 'marks', 'messaging', 'certificates'],
  college: ['attendance', 'exams', 'marks', 'course_credits', 'certificates']
};

function defaultConfigForOrgType(type) {
  const activeModules = DEFAULT_MODULES_BY_TYPE[type];
  if (!activeModules) {
    throw new Error('Invalid institution type. Must be kindergarten, school, or college.');
  }
  return {
    active_modules: activeModules,
    branding: { primaryColor: '#4f46e5', logoUrl: '/logo.png' },
    vocabulary_override: {},
    dashboard_apps: DEFAULT_DASHBOARD_APPS
  };
}

// Deterministic schema name for a tenant domain, shared by the CLI
// provisioning script and the self-serve registration flow so a schema
// name reserved at registration time and the one actually created at
// approval time can never diverge.
function schemaNameForDomain(domain) {
  const schemaName = `tenant_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error('Generated schema name contains unsafe characters.');
  }
  return schemaName;
}

module.exports = { DEFAULT_MODULES_BY_TYPE, defaultConfigForOrgType, schemaNameForDomain };
