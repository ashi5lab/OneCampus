import { Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { SuperAdminProtectedRoute } from './components/SuperAdminProtectedRoute';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import { LandingPage } from './features/landing/components/LandingPage';
import { TenantRegisterPage } from './features/tenantRegistration/components/TenantRegisterPage';
import { SuperAdminDashboardPage } from './features/superAdmin/components/SuperAdminDashboardPage';
import { SuperAdminInboxPage } from './features/superAdmin/components/SuperAdminInboxPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LearnersPage } from './features/learners/components/LearnersPage';
import { LearnerProfilePage } from './features/learners/components/LearnerProfilePage';
import { InstructorsPage } from './features/instructors/components/InstructorsPage';
import { InstructorProfilePage } from './features/instructors/components/InstructorProfilePage';
import { CohortsPage } from './features/cohorts/components/CohortsPage';
import { CohortDetailPage } from './features/cohorts/components/CohortDetailPage';
import { AttendancePage } from './features/attendance/components/AttendancePage';
import { AbsenteeReportPage } from './features/attendance/components/AbsenteeReportPage';
import { EvaluationDetailPage } from './features/evaluations/components/EvaluationDetailPage';
import { ScoreEntryPage } from './features/evaluations/components/ScoreEntryPage';
import { UnitsPage } from './features/units/components/UnitsPage';
import { ModulesPage } from './features/modules/components/ModulesPage';
import { GuardiansPage } from './features/guardians/components/GuardiansPage';
import { GuardianProfilePage } from './features/guardians/components/GuardianProfilePage';
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
import { ManageDashboardAppsPage } from './features/sidebarSettings/components/ManageDashboardAppsPage';
import { MorePage } from './features/more/components/MorePage';
import { AdminToolsPage } from './features/more/components/AdminToolsPage';
import { BroadcastPage } from './features/broadcast/components/BroadcastPage';
import { AccessControlPage } from './features/accessControl/components/AccessControlPage';
import { AccessControlDetailPage } from './features/accessControl/components/AccessControlDetailPage';
import { AppManagementPage } from './features/appManagement/components/AppManagementPage';
import { LeavePage } from './features/leave/components/LeavePage';
import { CalendarPage } from './features/calendar/components/CalendarPage';
import { TimetablePage } from './features/timetable/components/TimetablePage';
import { BulkUploadPage } from './features/bulkUpload/components/BulkUploadPage';
import { StaffAttendancePage } from './features/staffAttendance/components/StaffAttendancePage';
import { DisciplinePage } from './features/discipline/components/DisciplinePage';
import { PtmPage } from './features/ptm/components/PtmPage';
import { AlumniPage } from './features/alumni/components/AlumniPage';
import { VisitorLogPage } from './features/visitors/components/VisitorLogPage';
import { ClassPage } from './features/classChannel/components/ClassPage';
import { AdminClassChannelsPage } from './features/classChannel/components/AdminClassChannelsPage';
import { ActivitiesPage } from './features/activities/components/ActivitiesPage';

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Public landing page (includes login modal) — no tenant session needed */}
      <Route path="/" element={<LandingPage />} />

      {/* Super admin area — its own auth context, scoped to this subtree only */}
      <Route element={<SuperAdminAuthProvider><Outlet /></SuperAdminAuthProvider>}>
        <Route path="/super-admin/register" element={<TenantRegisterPage />} />
        <Route
          path="/super-admin"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboardPage />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/super-admin/inquiries"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminInboxPage />
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
        <Route path="more" element={<MorePage />} />
        <Route
          path="admin-tools"
          element={
            <RequirePermission permission="users.manage_passwords">
              <AdminToolsPage />
            </RequirePermission>
          }
        />
        {/* Learner/instructor/staff redesign — Class/Activities are new,
            fixed nav destinations (see BottomTabBar/Sidebar's
            REDESIGNED_ROLES), not permission-gated like the roster routes
            above: access is cohort-membership-scoped inside the endpoints
            themselves (see server/lib/cohortAccess.js). */}
        <Route
          path="class"
          element={<ClassPage />}
        />
        <Route
          path="class/:cohortId"
          element={<ClassPage />}
        />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route
          path="manage-dashboard-apps"
          element={
            <RequirePermission permission="users.manage_passwords">
              <ManageDashboardAppsPage />
            </RequirePermission>
          }
        />
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
          path="class-channels"
          element={
            <RequirePermission permission="cohorts.view">
              <AdminClassChannelsPage />
            </RequirePermission>
          }
        />
        <Route
          path="class-channels/:cohortId"
          element={
            <RequirePermission permission="cohorts.view">
              <AdminClassChannelsPage />
            </RequirePermission>
          }
        />
        <Route
          path="cohorts/:id"
          element={
            <RequirePermission permission="cohorts.view">
              <CohortDetailPage />
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
        {/* Not RequirePermission-gated like the roster above — a guardian or
            learner without guardians.view can still view their own/their
            own guardian's profile; the endpoint itself enforces that (see
            server/modules/guardians/controller.js's getProfile). */}
        <Route path="guardians/:id" element={<GuardianProfilePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route
          path="attendance/absentees"
          element={
            <RequirePermission permission="attendance.view">
              <AbsenteeReportPage />
            </RequirePermission>
          }
        />
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
          path="access-control/:id"
          element={
            <RequirePermission permission="access_control.manage">
              <AccessControlDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="app-management"
          element={
            <RequirePermission permission="users.manage_passwords">
              <AppManagementPage />
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
          path="discipline"
          element={
            <RequirePermission permission="discipline.view">
              <DisciplinePage />
            </RequirePermission>
          }
        />
        <Route
          path="ptm"
          element={
            <RequirePermission permission="ptm.view">
              <PtmPage />
            </RequirePermission>
          }
        />
        <Route
          path="alumni"
          element={
            <RequirePermission permission="learners.view">
              <AlumniPage />
            </RequirePermission>
          }
        />
        <Route
          path="visitors"
          element={
            <RequirePermission permission="visitors.view">
              <VisitorLogPage />
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
    </>
  );
}
