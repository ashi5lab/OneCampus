import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './features/auth/components/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LearnersPage } from './features/learners/components/LearnersPage';
import { InstructorsPage } from './features/instructors/components/InstructorsPage';
import { CohortsPage } from './features/cohorts/components/CohortsPage';
import { AttendancePage } from './features/attendance/components/AttendancePage';
import { EvaluationsPage } from './features/evaluations/components/EvaluationsPage';
import { EvaluationDetailPage } from './features/evaluations/components/EvaluationDetailPage';
import { ScoreEntryPage } from './features/evaluations/components/ScoreEntryPage';

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
        <Route path="learners" element={<LearnersPage />} />
        <Route path="instructors" element={<InstructorsPage />} />
        <Route path="cohorts" element={<CohortsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="evaluations" element={<EvaluationsPage />} />
        <Route path="evaluations/:id" element={<EvaluationDetailPage />} />
        <Route path="evaluations/schedules/:scheduleId/scores" element={<ScoreEntryPage />} />
      </Route>
    </Routes>
  );
}
