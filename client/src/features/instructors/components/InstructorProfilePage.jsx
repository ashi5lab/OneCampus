import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { Badge } from '../../../components/Badge';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useInstructorProfile, useUpdateInstructor, useDeleteInstructor } from '../hooks/useInstructors';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules } from '../hooks/useInstructorModules';
import { InstructorFormModal } from './InstructorFormModal';
import { idCardsApi } from '../../idCards/services/idCardsApi';

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'Attendance' }
];

export function InstructorProfilePage() {
  const { id } = useParams();
  const instructorId = Number(id);
  const navigate = useNavigate();
  const { t } = useConfig();
  const { profile: ownProfile, can } = useAuth();
  const { data, isLoading, error } = useInstructorProfile(instructorId);
  const { data: modules } = useModules();
  const { data: moduleLinks } = useInstructorModules();
  const updateInstructor = useUpdateInstructor();
  const deleteInstructor = useDeleteInstructor();
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);

  const isOwnProfile = ownProfile?.instructorId === instructorId;
  const canManage = can('instructors.manage');

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const { instructor, stats, recentAttendance } = data;
  const moduleNameById = new Map((modules || []).map((m) => [m.id, m.name]));
  const subjectNames = (moduleLinks || [])
    .filter((link) => link.instructor_id === instructorId)
    .map((link) => moduleNameById.get(link.module_id))
    .filter(Boolean);

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${instructor.first_name} ${instructor.last_name}?`)) return;
    deleteInstructor.mutate(instructorId, { onSuccess: () => navigate('/app/instructors') });
  }

  return (
    <div>
      <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
        Management / {t('instructors')}
      </div>

      <div className="mb-5 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="mb-3 sm:mb-0 sm:mr-4">
          {isOwnProfile ? (
            <ProfilePictureUploader
              name={`${instructor.first_name} ${instructor.last_name}`}
              pictureUrl={instructor.profile_picture_url}
              invalidateKey={['instructors', instructorId, 'profile']}
            />
          ) : (
            <Avatar name={`${instructor.first_name} ${instructor.last_name}`} src={instructor.profile_picture_url} size={72} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {instructor.first_name} {instructor.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-ink-500 sm:justify-start">
            <span className="font-mono">{instructor.staff_id}</span>
            {instructor.phone && <span>&middot; {instructor.phone}</span>}
          </div>
          {instructor.meta?.designation && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10.5px] font-bold capitalize text-accent-dark">
                {instructor.meta.designation.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid max-w-[360px] grid-cols-2 gap-3">
        <StatCard label="Attendance Marked" value={stats.attendanceMarked} />
        <StatCard label="Scores Graded" value={stats.scoresGraded} />
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
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">{t('topics')}</div>
              {subjectNames.length === 0 ? (
                <div className="rounded border border-border bg-surface-muted p-3.5 text-[13px] text-ink-500">
                  No {t('topics').toLowerCase()} assigned yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {subjectNames.map((name) => (
                    <span key={name} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-ink-700">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Personal Details</div>
              <div className="rounded border border-border bg-surface p-3.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-500">Gender</span>
                  <span className="font-semibold text-ink-900">{GENDER_LABEL[instructor.meta?.gender] || '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                  <span className="text-ink-500">Phone</span>
                  <span className="font-semibold text-ink-900">{instructor.phone || '—'}</span>
                </div>
                {instructor.email && (
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                    <span className="text-ink-500">Email</span>
                    <span className="font-semibold text-ink-900">{instructor.email}</span>
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
            <button
              onClick={() => idCardsApi.downloadInstructorCard(instructorId, instructor.staff_id)}
              className="rounded border border-border px-3.5 py-2 text-[12.5px] font-semibold text-ink-700 hover:bg-surface-muted"
            >
              Download ID Card
            </button>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div>
          <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Recent Activity</div>
          <div className="overflow-hidden rounded border border-border bg-surface">
            <DataTable
              columns={[
                { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
                { key: 'learner', header: t('learner'), render: (row) => `${row.first_name} ${row.last_name}` },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge variant={row.status === 'present' ? 'active' : row.status === 'absent' ? 'inactive' : 'pending'}>{row.status}</Badge>
                }
              ]}
              rows={recentAttendance}
              rowKey={(row) => row.id}
              emptyMessage="No attendance marked yet."
            />
          </div>
        </div>
      )}

      <Link to="/app/instructors" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to {t('instructors')}
      </Link>

      {showEdit && (
        <InstructorFormModal
          initialData={instructor}
          onClose={() => setShowEdit(false)}
          submitting={updateInstructor.isPending}
          submitError={updateInstructor.error?.message}
          onSubmit={(values) =>
            updateInstructor.mutate({ id: instructorId, payload: values }, { onSuccess: () => setShowEdit(false) })
          }
        />
      )}
    </div>
  );
}
