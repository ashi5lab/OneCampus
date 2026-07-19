import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { Badge } from '../../../components/Badge';
import { Avatar } from '../../../components/Avatar';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useGuardianProfile, useUpdateGuardian, useDeleteGuardian } from '../hooks/useGuardians';
import { GuardianFormModal } from './GuardianFormModal';
import { GuardianLinksModal } from './GuardianLinksModal';

export function GuardianProfilePage() {
  const { id } = useParams();
  const guardianId = Number(id);
  const navigate = useNavigate();
  const { profile: ownProfile, can } = useAuth();
  const { data, isLoading, error } = useGuardianProfile(guardianId);
  const updateGuardian = useUpdateGuardian();
  const deleteGuardian = useDeleteGuardian();
  const [showEdit, setShowEdit] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  const isOwnProfile = ownProfile?.guardianId === guardianId;
  const canManage = can('guardians.manage');
  const canManageLinks = can('guardian_links.manage');

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const { guardian, learners } = data;

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${guardian.first_name} ${guardian.last_name}?`)) return;
    deleteGuardian.mutate(guardianId, { onSuccess: () => navigate('/app/guardians') });
  }

  return (
    <div>
      <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
        Management / Guardians
      </div>

      <div className="mb-5 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="mb-3 sm:mb-0 sm:mr-4">
          {isOwnProfile ? (
            <ProfilePictureUploader
              name={`${guardian.first_name} ${guardian.last_name}`}
              pictureUrl={guardian.profile_picture_url}
              invalidateKey={['guardians', guardianId, 'profile']}
            />
          ) : (
            <Avatar name={`${guardian.first_name} ${guardian.last_name}`} src={guardian.profile_picture_url} size={72} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {guardian.first_name} {guardian.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-ink-500 sm:justify-start">
            <span>{guardian.phone}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <Badge variant={guardian.whatsapp_opt_in ? 'active' : 'inactive'}>
              {guardian.whatsapp_opt_in ? 'WhatsApp opted in' : 'WhatsApp not opted in'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-5 grid max-w-[200px] grid-cols-1 gap-3">
        <StatCard label="Linked Students" value={learners.length} />
      </div>

      <div className="max-w-[760px] space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Linked Students</div>
              {canManageLinks && (
                <button
                  onClick={() => setShowLinks(true)}
                  className="text-[11.5px] font-semibold text-accent hover:opacity-80"
                >
                  Manage
                </button>
              )}
            </div>
            {learners.length === 0 ? (
              <div className="rounded border border-border bg-surface-muted p-3.5 text-[13px] text-ink-500">
                No students linked yet.
              </div>
            ) : (
              <div className="space-y-2">
                {learners.map((l) => (
                  <Link
                    key={l.id}
                    to={`/app/learners/${l.id}`}
                    className="flex items-center gap-2.5 rounded border border-border bg-surface p-3 text-[13px] hover:bg-surface-muted"
                  >
                    <Avatar name={`${l.first_name} ${l.last_name}`} src={l.profile_picture_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-ink-900">{l.first_name} {l.last_name}</div>
                      <div className="truncate text-[11.5px] text-ink-500">
                        <span className="font-mono">{l.registry_no}</span>
                        {l.cohort_name && <span> &middot; {l.cohort_name}</span>}
                      </div>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-ink-500" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Personal Details</div>
            <div className="rounded border border-border bg-surface p-3.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-500">Phone</span>
                <span className="font-semibold text-ink-900">{guardian.phone || '—'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                <span className="text-ink-500">Address</span>
                <span className="max-w-[60%] text-right font-semibold text-ink-900">{guardian.address || '—'}</span>
              </div>
              {guardian.email && (
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-surface-muted pt-2">
                  <span className="text-ink-500">Email</span>
                  <span className="font-semibold text-ink-900">{guardian.email}</span>
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
        </div>
      </div>

      <Link to="/app/guardians" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to Guardians
      </Link>

      {showEdit && (
        <GuardianFormModal
          initialData={guardian}
          onClose={() => setShowEdit(false)}
          submitting={updateGuardian.isPending}
          submitError={updateGuardian.error?.message}
          onSubmit={(values) =>
            updateGuardian.mutate({ id: guardianId, payload: values }, { onSuccess: () => setShowEdit(false) })
          }
        />
      )}

      {showLinks && <GuardianLinksModal guardian={guardian} onClose={() => setShowLinks(false)} />}
    </div>
  );
}
