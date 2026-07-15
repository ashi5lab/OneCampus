import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { LoginPage } from './features/auth/components/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LearnersPage } from './features/learners/components/LearnersPage';
import { InstructorsPage } from './features/instructors/components/InstructorsPage';
import { CohortsPage } from './features/cohorts/components/CohortsPage';
import { AttendancePage } from './features/attendance/components/AttendancePage';
import { EvaluationsPage } from './features/evaluations/components/EvaluationsPage';
import { EvaluationDetailPage } from './features/evaluations/components/EvaluationDetailPage';
import { ScoreEntryPage } from './features/evaluations/components/ScoreEntryPage';
import { UnitsPage } from './features/units/components/UnitsPage';
import { GuardiansPage } from './features/guardians/components/GuardiansPage';
import { CertificatesPage } from './features/certificates/components/CertificatesPage';
import { KindergartenActivityPage } from './features/kindergartenActivity/components/KindergartenActivityPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="learners"
          element={
            <RequirePermission permission="learners.view">
              <LearnersPage />
            </RequirePermission>
          }
        />
        <Route
          path="instructors"
          element={
            <RequirePermission permission="instructors.view">
              <InstructorsPage />
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
          path="guardians"
          element={
            <RequirePermission permission="guardians.view">
              <GuardiansPage />
            </RequirePermission>
          }
        />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="evaluations" element={<EvaluationsPage />} />
        <Route path="evaluations/:id" element={<EvaluationDetailPage />} />
        <Route path="evaluations/schedules/:scheduleId/scores" element={<ScoreEntryPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="kindergarten-activity" element={<KindergartenActivityPage />} />
      </Route>
    </Routes>
  );
}
