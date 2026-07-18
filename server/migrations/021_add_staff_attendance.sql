-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/staffAttendance — daily attendance for instructors
-- and staff themselves, distinct from onec_attendance (learners only).

-- Keyed on the roster row (onec_instructors.id / onec_staff.id), NOT
-- user_id — bulk-uploaded instructors/staff commonly have no login account
-- at all (onec_instructors.user_id/onec_staff.user_id are nullable; see
-- server/modules/bulkUpload), and attendance has to work for them too.
-- staff_role disambiguates which of the two roster tables roster_id
-- resolves to, same pattern as onec_leave_requests.applicant_role.
-- user_id is stored too, but nullable and only for a person who *does* have
-- a login — it's what GET /staff-attendance/mine filters by, since only a
-- logged-in person can view their own attendance in the first place.
CREATE TABLE IF NOT EXISTS onec_staff_attendance (
    id SERIAL PRIMARY KEY,
    staff_role VARCHAR(20) NOT NULL,   -- 'instructor' | 'staff'
    roster_id INT NOT NULL,
    user_id INT REFERENCES onec_users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,   -- 'present' | 'absent' | 'late' | 'excused' — same vocabulary as onec_attendance
    remarks VARCHAR(255),
    marked_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_role, roster_id, date)
);

-- staff_attendance.* added to server/lib/permissions.js's
-- DEFAULT_ROLE_PERMISSIONS — existing tenants need these rows retrofitted
-- too (new tenants get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'staff_attendance.view'), ('admin', 'staff_attendance.mark'), ('admin', 'staff_attendance.view_own'),
  ('staff', 'staff_attendance.view'), ('staff', 'staff_attendance.mark'), ('staff', 'staff_attendance.view_own'),
  ('instructor', 'staff_attendance.view_own')
ON CONFLICT (role, permission) DO NOTHING;
