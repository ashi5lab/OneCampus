import { Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { SuperAdminProtectedRoute } from './components/SuperAdminProtectedRoute';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import { LandingPage } from './features/landing/components/LandingPage';
import { LoginPage } from './features/auth/components/LoginPage';
import { TenantRegisterPage } from './features/tenantRegistration/components/TenantRegisterPage';
import { SuperAdminLoginPage } from './features/superAdmin/components/SuperAdminLoginPage';
import { SuperAdminDashboardPage } from './features/superAdmin/components/SuperAdminDashboardPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LearnersPage } from './features/learners/components/LearnersPage';
import { LearnerProfilePage } from './features/learners/components/LearnerProfilePage';
import { InstructorsPage } from './features/instructors/components/InstructorsPage';
import { InstructorProfilePage } from './features/instructors/components/InstructorProfilePage';
import { CohortsPage } from './features/cohorts/components/CohortsPage';
import { AttendancePage } from './features/attendance/components/AttendancePage';
import { EvaluationDetailPage } from './features/evaluations/components/EvaluationDetailPage';
import { ScoreEntryPage } from './features/evaluations/components/ScoreEntryPage';
import { UnitsPage } from './features/units/components/UnitsPage';
import { ModulesPage } from './features/modules/components/ModulesPage';
import { GuardiansPage } from './features/guardians/components/GuardiansPage';
import { CertificatesPage } from './features/certificates/components/CertificatesPage';
import { KindergartenActivityPage } from './features/kindergartenActivity/components/KindergartenActivityPage';
import { MessagesPage } from './features/messages/components/MessagesPage';
import { NoticesPage } from './features/notices/components/NoticesPage';
import { LibraryPage } from './features/library/components/LibraryPage';
import { AssignmentsPage } from './features/assignments/components/AssignmentsPage';
import { AssignmentDetailPage } from './features/assignments/components/AssignmentDetailPage';
import { OnlineExamDetailPage } from './features/onlineExams/components/OnlineExamDetailPage';
import { ExamsPage } from './features/exams/components/ExamsPage';
import { ReportsPage } from './features/reports/components/ReportsPage';
import { ProfilePage } from './features/profile/components/ProfilePage';
import { BroadcastPage } from './features/broadcast/components/BroadcastPage';
import { AccessControlPage } from './features/accessControl/components/AccessControlPage';
import { LeavePage } from './features/leave/components/LeavePage';
import { CalendarPage } from './features/calendar/components/CalendarPage';
import { TimetablePage } from './features/timetable/components/TimetablePage';
import { BulkUploadPage } from './features/bulkUpload/components/BulkUploadPage';
import { StaffAttendancePage } from './features/staffAttendance/components/StaffAttendancePage';

export default function App() {
  return (
    <Routes>
      {/* Public landing + tenant registration/login — no tenant session needed */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<TenantRegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Super admin area — its own auth context, scoped to this subtree only */}
      <Route element={<SuperAdminAuthProvider><Outlet /></SuperAdminAuthProvider>}>
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route
          path="/super-admin"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboardPage />
            </SuperAdminProtectedRoute>
          }
        />
      </Route>

      {/* Tenant app — everything that used to live at "/" now lives under "/app" */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        {/* Every authenticated user's own account screen — no permission
            gate, all routes inside touch only the caller's own row (the
            admin reset section hides itself without users.manage_passwords). */}
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="learners"
          element={
            <RequirePermission permission="learners.view">
              <LearnersPage />
            </RequirePermission>
          }
        />
        {/* Not RequirePermission-gated like the roster above — a learner or
            guardian without learners.view can still view their own/linked
            child's profile; the endpoint itself enforces that (see
            server/modules/learners/controller.js's getProfile). */}
        <Route path="learners/:id" element={<LearnerProfilePage />} />
        <Route
          path="instructors"
          element={
            <RequirePermission permission="instructors.view">
              <InstructorsPage />
            </RequirePermission>
          }
        />
        <Route
          path="instructors/:id"
          element={
            <RequirePermission permission="instructors.view">
              <InstructorProfilePage />
            </RequirePermission>
          }
        />
        <Route
          path="cohorts"
          element={
            <RequirePermission permission="cohorts.view">
              <CohortsPage />
            </RequirePermission>
          }
        />
        <Route
          path="units"
          element={
            <RequirePermission permission="units.view">
              <UnitsPage />
            </RequirePermission>
          }
        />
        <Route
          path="modules"
          element={
            <RequirePermission permission="modules.view">
              <ModulesPage />
            </RequirePermission>
          }
        />
        <Route
          path="guardians"
          element={
            <RequirePermission permission="guardians.view">
              <GuardiansPage />
            </RequirePermission>
          }
        />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="evaluations/:id" element={<EvaluationDetailPage />} />
        <Route path="evaluations/schedules/:scheduleId/scores" element={<ScoreEntryPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="kindergarten-activity" element={<KindergartenActivityPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="assignments/:id" element={<AssignmentDetailPage />} />
        <Route path="online-exams/:id" element={<OnlineExamDetailPage />} />
        <Route
          path="reports"
          element={
            <RequirePermission permission="reports.view">
              <ReportsPage />
            </RequirePermission>
          }
        />
        <Route
          path="broadcast"
          element={
            <RequirePermission permission="broadcast.view">
              <BroadcastPage />
            </RequirePermission>
          }
        />
        <Route
          path="access-control"
          element={
            <RequirePermission permission="access_control.manage">
              <AccessControlPage />
            </RequirePermission>
          }
        />
        <Route
          path="bulk-upload"
          element={
            <RequirePermission permission="bulk_upload.manage">
              <BulkUploadPage />
            </RequirePermission>
          }
        />
        <Route
          path="staff-attendance"
          element={
            <RequirePermission permission="staff_attendance.view_own">
              <StaffAttendancePage />
            </RequirePermission>
          }
        />
        <Route
          path="leave"
          element={
            <RequirePermission permission="leave.apply">
              <LeavePage />
            </RequirePermission>
          }
        />
        <Route
          path="calendar"
          element={
            <RequirePermission permission="calendar.view">
              <CalendarPage />
            </RequirePermission>
          }
        />
        <Route
          path="timetable"
          element={
            <RequirePermission permission="timetable.view">
              <TimetablePage />
            </RequirePermission>
          }
        />
      </Route>
    </Routes>
  );
}
