import { useParams, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { Badge } from '../../../components/Badge';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useInstructorProfile } from '../hooks/useInstructors';

export function InstructorProfilePage() {
  const { id } = useParams();
  const instructorId = Number(id);
  const { t } = useConfig();
  const { profile: ownProfile } = useAuth();
  const { data, isLoading, error } = useInstructorProfile(instructorId);

  const isOwnProfile = ownProfile?.instructorId === instructorId;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const { instructor, stats, recentAttendance } = data;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / {t('instructors')}
        </div>
        <div className="flex flex-wrap items-start gap-4">
          {isOwnProfile ? (
            <ProfilePictureUploader
              name={`${instructor.first_name} ${instructor.last_name}`}
              pictureUrl={instructor.profile_picture_url}
              invalidateKey={['instructors', instructorId, 'profile']}
            />
          ) : (
            <Avatar name={`${instructor.first_name} ${instructor.last_name}`} src={instructor.profile_picture_url} size={72} />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {instructor.first_name} {instructor.last_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
              <span className="font-mono">{instructor.staff_id}</span>
              {instructor.phone && <span>{instructor.phone}</span>}
            </div>
            {instructor.email && <div className="mt-1 text-[13px] text-ink-500">{instructor.email}</div>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance Marked" value={stats.attendanceMarked} />
        <StatCard label="Scores Graded" value={stats.scoresGraded} />
      </div>

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

      <Link to="/app/instructors" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to {t('instructors')}
      </Link>
    </div>
  );
}
