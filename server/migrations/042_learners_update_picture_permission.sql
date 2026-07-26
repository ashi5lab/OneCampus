-- Migration 042: Add learners.update_picture permission
--
-- Narrower than learners.manage (full roster CRUD) — lets instructors
-- upload/remove a student's profile picture without granting them the
-- rest of learner record management (create/edit/delete/cohort reassign).
-- See server/modules/profile/routes.js (requirePermission.any) and
-- server/lib/permissions.js.

INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin',      'learners.update_picture'),
  ('instructor', 'learners.update_picture'),
  ('instructor', 'learners.view')
ON CONFLICT (role, permission) DO NOTHING;
