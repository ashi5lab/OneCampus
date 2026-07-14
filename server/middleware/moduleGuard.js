module.exports = (requiredModule) => (req, res, next) => {
  const activeModules = req.tenantConfig?.config?.active_modules || [];
  if (!activeModules.includes(requiredModule)) {
    return res.status(403).json({ error: `The ${requiredModule} module is not enabled for this institution.` });
  }
  next();
};
