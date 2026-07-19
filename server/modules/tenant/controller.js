const { z } = require('zod');
const db = require('../../config/db');
const { SIDEBAR_LINK_KEYS, DEFAULT_SIDEBAR_LINKS } = require('../../lib/sidebarLinks');

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
      // Falls back for any tenant provisioned before this key existed —
      // same pattern as active_modules/branding/vocabulary_override above,
      // no migration/backfill needed since config is a schemaless JSONB.
      sidebar_links: tenant.config?.sidebar_links || DEFAULT_SIDEBAR_LINKS
    }
  });
}

const updateSidebarLinksSchema = z.object({
  sidebar_links: z.array(z.string()).max(SIDEBAR_LINK_KEYS.length)
});

// PATCH /api/v1/tenant/config/sidebar-links — which optional nav items show
// in the sidebar for every user at this tenant (Dashboard/Students/Teachers/
// Classes are always shown regardless, see client/src/lib/sidebarLinks.js).
// Writes straight to public.onec_tenants (not req.db, which is pinned to
// the tenant's own schema by tenantDb — this table lives in public, same as
// every other onec_tenants touch in server/modules/platform/controller.js).
async function updateSidebarLinks(req, res) {
  try {
    const parsed = updateSidebarLinksSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const invalidKeys = parsed.data.sidebar_links.filter((key) => !SIDEBAR_LINK_KEYS.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: `Unknown sidebar item(s): ${invalidKeys.join(', ')}` });
    }

    const result = await db.query(
      `UPDATE public.onec_tenants SET config = jsonb_set(config, '{sidebar_links}', $1::jsonb) WHERE id = $2 RETURNING config`,
      [JSON.stringify(parsed.data.sidebar_links), req.tenantConfig.id]
    );

    res.json({ data: { sidebar_links: result.rows[0].config.sidebar_links } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getConfig, updateSidebarLinks };
