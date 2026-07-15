const express = require('express');
const router = express.Router();
const controller = require('./controller');
const requireSuperAdmin = require('../../middleware/requireSuperAdmin');
const { superAdminLoginRateLimiter, tenantRegisterRateLimiter } = require('../../middleware/rateLimiters');

// Mounted in server.js *before* tenantResolver/tenantDb — these routes
// operate on the public schema directly (tenant registration, and
// cross-tenant super admin management) and must work with no tenant
// resolved yet.

// Public: self-serve tenant registration + status polling.
router.post('/tenants/register', tenantRegisterRateLimiter, controller.register);
router.get('/tenants/status', controller.getRegistrationStatus);

// Public: super admin login.
router.post('/super-admin/login', superAdminLoginRateLimiter, controller.superAdminLogin);

// Super-admin-only tenant management.
router.get('/super-admin/me', requireSuperAdmin, controller.superAdminMe);
router.get('/tenants', requireSuperAdmin, controller.listTenants);
router.patch('/tenants/:id/approve', requireSuperAdmin, controller.approveTenant);
router.patch('/tenants/:id/decline', requireSuperAdmin, controller.declineTenant);
router.patch('/tenants/:id', requireSuperAdmin, controller.updateTenant);
router.delete('/tenants/:id', requireSuperAdmin, controller.deleteTenant);

module.exports = router;
