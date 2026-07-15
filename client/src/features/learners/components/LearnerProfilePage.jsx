import { useParams, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { Badge } from '../../../components/Badge';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useLearnerProfile } from '../hooks/useLearners';
import { certificatesApi } from '../../certificates/services/certificatesApi';

const ATTENDANCE_STATUS_ORDER = ['present', 'absent', 'late', 'excused'];
const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive' };

export function LearnerProfilePage() {
  const { id } = useParams();
  const learnerId = Number(id);
  const { t } = useConfig();
  const { profile: ownProfile } = useAuth();
  const { data, isLoading, error } = useLearnerProfile(learnerId);

  const isOwnProfile = ownProfile?.learnerId === learnerId;

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

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / {t('learners')}
        </div>
        <div className="flex flex-wrap items-start gap-4">
          {isOwnProfile ? (
            <ProfilePictureUploader
              name={`${learner.first_name} ${learner.last_name}`}
              pictureUrl={learner.profile_picture_url}
              invalidateKey={['learners', learnerId, 'profile']}
            />
          ) : (
            <Avatar name={`${learner.first_name} ${learner.last_name}`} src={learner.profile_picture_url} size={72} />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {learner.first_name} {learner.last_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
              <span className="font-mono">{learner.registry_no}</span>
              <Badge variant={STATUS_VARIANT[learner.status] || 'active'}>{learner.status}</Badge>
              {learner.cohort_name && <span>{learner.cohort_name}</span>}
              {learner.unit_name && <span>&middot; {learner.unit_name}</span>}
            </div>
            {learner.email && <div className="mt-1 text-[13px] text-ink-500">{learner.email}</div>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance Records" value={totalAttendance} />
        <StatCard label="Present" value={attendanceCounts.present ?? 0} />
        <StatCard label="Absent" value={attendanceCounts.absent ?? 0} />
        <StatCard label="Exams Taken" value={scores.length} />
      </div>

      {guardians.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Guardians</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {guardians.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded border border-border bg-surface p-3">
                <Avatar name={`${g.first_name} ${g.last_name}`} src={g.profile_picture_url} size={40} />
                <div>
                  <div className="text-[13.5px] font-semibold text-ink-900">
                    {g.first_name} {g.last_name}
                  </div>
                  <div className="text-[12px] text-ink-500">{g.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
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

      <div className="mb-6">
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

      <Link to="/app/learners" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to {t('learners')}
      </Link>
    </div>
  );
}
