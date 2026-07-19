const { z } = require('zod');
const db = require('../../config/db');
const { DASHBOARD_APP_KEYS, DEFAULT_DASHBOARD_APPS } = require('../../lib/sidebarLinks');

// Returns only the subset of tenant config that's safe to expose publicly
// (no schema_name or other internal identifiers) — this is what the
// frontend uses to bootstrap branding/vocabulary/nav before login.
function getConfig(req, res) {
  const tenant = req.tenantConfig;
  res.json({
    data: {
      org_name: tenant.org_name,
      org_type: tenant.org_type,
      active_modules: tenant.config?.active_modules || [],
      branding: tenant.config?.branding || {},
      vocabulary_override: tenant.config?.vocabulary_override || {},
      // dashboard_apps falls back to the legacy sidebar_links key (tenants
      // configured before this was renamed from "which sidebar items show"
      // to "which Dashboard cards show"), then the default set — same
      // schemaless-JSONB fallback pattern as active_modules/branding above,
      // no migration/backfill needed.
      dashboard_apps: tenant.config?.dashboard_apps || tenant.config?.sidebar_links || DEFAULT_DASHBOARD_APPS
    }
  });
}

const updateDashboardAppsSchema = z.object({
  dashboard_apps: z.array(z.string()).max(DASHBOARD_APP_KEYS.length)
});

// PATCH /api/v1/tenant/config/dashboard-apps — which optional feature cards
// show on the Dashboard's "Your Modules" grid for every user at this tenant
// (the sidebar/bottom-tab nav — Dashboard/Students/Classes/More/Settings —
// is fixed and not covered by this list; see client/src/lib/sidebarLinks.js).
// Writes straight to public.onec_tenants (not req.db, which is pinned to
// the tenant's own schema by tenantDb — this table lives in public, same as
// every other onec_tenants touch in server/modules/platform/controller.js).
async function updateDashboardApps(req, res) {
  try {
    const parsed = updateDashboardAppsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const invalidKeys = parsed.data.dashboard_apps.filter((key) => !DASHBOARD_APP_KEYS.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: `Unknown dashboard app(s): ${invalidKeys.join(', ')}` });
    }

    const result = await db.query(
      `UPDATE public.onec_tenants SET config = jsonb_set(config, '{dashboard_apps}', $1::jsonb) WHERE id = $2 RETURNING config`,
      [JSON.stringify(parsed.data.dashboard_apps), req.tenantConfig.id]
    );

    res.json({ data: { dashboard_apps: result.rows[0].config.dashboard_apps } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getConfig, updateDashboardApps };
