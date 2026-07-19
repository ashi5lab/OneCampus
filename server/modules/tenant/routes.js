const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

// No auth required — this is what the frontend fetches on load, before login,
// to know which modules/vocabulary/branding/sidebar to render.
router.get('/config', controller.getConfig);

// users.manage_passwords is the same permission the "Admin" tab on the
// account Settings page is gated behind — Manage Sidebar lives there too,
// so this stays consistent with that existing "tenant-wide admin action"
// grouping rather than introducing a new granular permission for one page.
router.patch('/config/sidebar-links', auth, requirePermission('users.manage_passwords'), controller.updateSidebarLinks);

module.exports = router;
