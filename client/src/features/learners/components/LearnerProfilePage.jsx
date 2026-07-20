import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { Badge } from '../../../components/Badge';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useLearnerProfile, useUpdateLearner, useDeleteLearner } from '../hooks/useLearners';
import { LearnerFormModal } from './LearnerFormModal';
import { certificatesApi } from '../../certificates/services/certificatesApi';
import { evaluationsApi } from '../../evaluations/services/evaluationsApi';
import { ReportCardModal } from '../../evaluations/components/ReportCardModal';
import { idCardsApi } from '../../idCards/services/idCardsApi';
import { MarkAlumniModal } from '../../alumni/components/MarkAlumniModal';
import { LearnerGuardianLinksModal } from '../../guardians/components/LearnerGuardianLinksModal';

const ATTENDANCE_STATUS_ORDER = ['present', 'absent', 'late', 'excused'];
const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive', alumni: 'pending' };
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'academics', label: 'Academics' }
];

export function LearnerProfilePage() {
  const { id } = useParams();
  const learnerId = Number(id);
  const navigate = useNavigate();
  const { t } = useConfig();
  const { profile: ownProfile, can } = useAuth();
  const { data, isLoading, error } = useLearnerProfile(learnerId);
  const updateLearner = useUpdateLearner();
  const deleteLearner = useDeleteLearner();
  const [tab, setTab] = useState('overview');
  const [viewingEvaluationId, setViewingEvaluationId] = useState(null);
  const [showMarkAlumni, setShowMarkAlumni] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showGuardianLinks, setShowGuardianLinks] = useState(false);

  const isOwnProfile = ownProfile?.learnerId === learnerId;
  const canManage = can('learners.manage');
  const canManageGuardianLinks = can('guardian_links.manage');

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const { learner, guardians, attendance, scores, certificates } = data;
  const attendanceCounts = Object.fromEntries(attendance.summary.map((row) => [row.status, row.count]));
  const totalAttendance = attendance.summary.reduce((sum, row) => sum + row.count, 0);
  const attendanceRate = totalAttendance > 0 ? Math.round(((attendanceCounts.present ?? 0) / totalAttendance) * 100) : null;
  const avgScorePct = scores.length > 0
    ? Math.round((scores.reduce((sum, s) => sum + Number(s.score_obtained) / Number(s.max_score), 0) / scores.length) * 100)
    : null;
  const rolesCount = (learner.meta?.is_school_head ? 1 : 0) + (learner.meta?.is_class_head ? 1 : 0);

  // Report cards are per-evaluation (e.g. "Term 1 Exams"), but `scores` is a
  // flat list of every individual subject score across every evaluation —
  // derive the distinct evaluations client-side rather than adding a
  // separate endpoint just to list "which exams has this learner sat".
  const evaluationsWithScores = Array.from(
    new Map(scores.map((s) => [s.evaluation_id, { id: s.evaluation_id, name: s.evaluation_name }])).values()
  );

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${learner.first_name} ${learner.last_name}?`)) return;
    deleteLearner.mutate(learnerId, { onSuccess: () => navigate('/app/learners') });
  }

  return (
    <div>
      <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
        Management / {t('learners')}
      </div>

      <div className="mb-5 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="mb-3 sm:mb-0 sm:mr-4">
          {isOwnProfile ? (
            <ProfilePictureUploader
              name={`${learner.first_name} ${learner.last_name}`}
              pictureUrl={learner.profile_picture_url}
              invalidateKey={['learners', learnerId, 'profile']}
            />
          ) : (
            <Avatar name={`${learner.first_name} ${learner.last_name}`} src={learner.profile_picture_url} size={72} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {learner.first_name} {learner.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-ink-500 sm:justify-start">
            <span className="font-mono">{learner.registry_no}</span>
            {learner.cohort_name && <span>&middot; {learner.cohort_name}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <Badge variant={STATUS_VARIANT[learner.status] || 'active'}>{learner.status}</Badge>
            {learner.meta?.is_school_head && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10.5px] font-bold text-accent-dark">School Head</span>
            )}
            {learner.meta?.is_class_head && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-ink-700">Class Head</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 grid max-w-[500px] grid-cols-3 gap-3">
        <StatCard label="Attendance" value={attendanceRate != null ? `${attendanceRate}%` : '—'} />
        <StatCard label="Avg Score" value={avgScorePct != null ? `${avgScorePct}%` : '—'} />
        <StatCard label="Roles" value={rolesCount} />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((tabOption) => (
          <button
            key={tabOption.key}
            onClick={() => setTab(tabOption.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === tabOption.key ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {tabOption.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="max-w-[760px] space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Guardians</div>
                {canManageGuardianLinks && (
                  <button
                    onClick={() => setShowGuardianLinks(true)}
                    className="text-[11.5px] font-semibold text-accent hover:opacity-80"
                  >
                    Manage
                  </button>
                )}
              </div>
              {guardians.length === 0 ? (
                <div className="rounded border border-border bg-surface-muted p-3.5 text-[13px] text-ink-500">
                  No guardians linked yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {guardians.map((g) => (
                    <Link
                      key={g.id}
                      to={`/app/guardians/${g.id}`}
                      className="block rounded border border-border bg-surface p-3.5 text-[13px] hover:bg-surface-muted"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ink-500">Name</span>
                        <span className="font-semibold text-accent-dark">{g.first_name} {g.last_name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                        <span className="text-ink-500">Phone</span>
                        <span className="font-semibold text-ink-900">{g.phone}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Personal Details</div>
              <div className="rounded border border-border bg-surface p-3.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-500">Gender</span>
                  <span className="font-semibold text-ink-900">{learner.meta?.gender ? learner.meta.gender[0].toUpperCase() + learner.meta.gender.slice(1) : '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                  <span className="text-ink-500">Date of birth</span>
                  <span className="font-semibold text-ink-900">{learner.meta?.date_of_birth ? new Date(learner.meta.date_of_birth).toLocaleDateString() : '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                  <span className="text-ink-500">Admitted</span>
                  <span className="font-semibold text-ink-900">{learner.meta?.admission_date ? new Date(learner.meta.admission_date).toLocaleDateString() : '—'}</span>
                </div>
                {learner.email && (
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                    <span className="text-ink-500">Email</span>
                    <span className="font-semibold text-ink-900">{learner.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage && (
              <button
                onClick={() => setShowEdit(true)}
                className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-accent-ink"
              >
                Edit profile
              </button>
            )}
            {canManage && (
              <button
                onClick={handleDelete}
                className="rounded border border-danger px-4 py-2 text-[12.5px] font-semibold text-danger"
              >
                Delete
              </button>
            )}
            {canManage && learner.status !== 'alumni' && (
              <button
                onClick={() => setShowMarkAlumni(true)}
                className="rounded border border-border px-3.5 py-2 text-[12.5px] font-semibold text-ink-700 hover:bg-surface-muted"
              >
                Mark as Alumni
              </button>
            )}
            <button
              onClick={() => idCardsApi.downloadLearnerCard(learnerId, learner.registry_no)}
              className="rounded border border-border px-3.5 py-2 text-[12.5px] font-semibold text-ink-700 hover:bg-surface-muted"
            >
              Download ID Card
            </button>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div>
          <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Attendance ({ATTENDANCE_STATUS_ORDER.filter((s) => attendanceCounts[s]).join(', ') || 'no records yet'})
          </div>
          <div className="overflow-hidden rounded border border-border bg-surface">
            <DataTable
              columns={[
                { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge variant={row.status === 'present' ? 'active' : row.status === 'absent' ? 'inactive' : 'pending'}>{row.status}</Badge>
                },
                { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' }
              ]}
              rows={attendance.recent}
              rowKey={(row) => row.id}
              emptyMessage="No attendance records yet."
            />
          </div>
        </div>
      )}

      {tab === 'academics' && (
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Exam Scores</div>
            <div className="overflow-hidden rounded border border-border bg-surface">
              <DataTable
                columns={[
                  { key: 'module', header: t('topic'), render: (row) => row.module_name },
                  { key: 'evaluation', header: 'Exam', render: (row) => row.evaluation_name },
                  { key: 'date', header: 'Date', render: (row) => new Date(row.eval_date).toLocaleDateString() },
                  {
                    key: 'score',
                    header: 'Score',
                    render: (row) => (
                      <span className={Number(row.score_obtained) < Number(row.passing_score) ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                        {row.score_obtained} / {row.max_score}
                      </span>
                    )
                  }
                ]}
                rows={scores}
                rowKey={(row) => row.id}
                emptyMessage="No exam scores yet."
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Report Cards</div>
            <div className="overflow-hidden rounded border border-border bg-surface">
              <DataTable
                columns={[
                  { key: 'name', header: 'Evaluation', render: (row) => row.name },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setViewingEvaluationId(row.id)} className="text-xs font-semibold text-accent-dark hover:underline">
                          View
                        </button>
                        <button
                          onClick={() => evaluationsApi.downloadReportCardPdf(row.id, learnerId, `report-card-${learner.registry_no}-${row.id}.pdf`)}
                          className="text-xs font-semibold text-accent-dark hover:underline"
                        >
                          Download PDF
                        </button>
                      </div>
                    )
                  }
                ]}
                rows={evaluationsWithScores}
                rowKey={(row) => row.id}
                emptyMessage="No evaluations graded yet."
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Certificates</div>
            <div className="overflow-hidden rounded border border-border bg-surface">
              <DataTable
                columns={[
                  { key: 'type', header: 'Type', render: (row) => row.type.replace(/_/g, ' ') },
                  { key: 'certificate_no', header: 'Certificate No.', render: (row) => <span className="font-mono">{row.certificate_no}</span> },
                  { key: 'issue_date', header: 'Issued', render: (row) => new Date(row.issue_date).toLocaleDateString() },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <button
                        onClick={() => certificatesApi.downloadPdf(row.id, row.certificate_no)}
                        className="text-xs font-semibold text-accent-dark hover:underline"
                      >
                        Download PDF
                      </button>
                    )
                  }
                ]}
                rows={certificates}
                rowKey={(row) => row.id}
                emptyMessage="No certificates issued yet."
              />
            </div>
          </div>
        </div>
      )}

      <Link to="/app/learners" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to {t('learners')}
      </Link>

      {viewingEvaluationId && (
        <ReportCardModal evaluationId={viewingEvaluationId} learnerId={learnerId} onClose={() => setViewingEvaluationId(null)} />
      )}
      {showMarkAlumni && <MarkAlumniModal learner={learner} onClose={() => setShowMarkAlumni(false)} />}
      {showGuardianLinks && <LearnerGuardianLinksModal learner={learner} onClose={() => setShowGuardianLinks(false)} />}
      {showEdit && (
        <LearnerFormModal
          initialData={learner}
          onClose={() => setShowEdit(false)}
          submitting={updateLearner.isPending}
          submitError={updateLearner.error?.message}
          onSubmit={(values) =>
            updateLearner.mutate({ id: learnerId, payload: values }, { onSuccess: () => setShowEdit(false) })
          }
        />
      )}
    </div>
  );
}
