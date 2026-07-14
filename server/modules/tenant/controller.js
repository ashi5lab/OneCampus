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
      vocabulary_override: tenant.config?.vocabulary_override || {}
    }
  });
}

module.exports = { getConfig };
