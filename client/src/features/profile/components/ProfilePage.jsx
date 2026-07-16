import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { useMyProfile, useChangePassword, useAllUsers, useAdminChangePassword, MY_PROFILE_KEY } from '../hooks/useProfile';

// Every authenticated user's own account screen (reached by clicking the
// avatar/name in the sidebar): profile picture + change-own-password. An
// admin (users.manage_passwords) additionally gets a reset-any-user's-
// password section at the bottom.
export function ProfilePage() {
  const { can, profile } = useAuth();
  const { data: me, isLoading, error } = useMyProfile();
  const canManagePasswords = can('users.manage_passwords');
  // Learners/instructors also have an academic profile page (marks,
  // attendance, insights) — link across to it from the account screen.
  const insightsLink = profile?.learnerId
    ? `/app/learners/${profile.learnerId}`
    : profile?.instructorId
      ? `/app/instructors/${profile.instructorId}`
      : null;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div className="max-w-[560px]">
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Account</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">My Profile</h1>
      </div>

      <div className="mb-5 rounded border border-border bg-surface p-5">
        <ProfilePictureUploader name={me.username} pictureUrl={me.profile_picture_url} invalidateKey={MY_PROFILE_KEY} />
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[13.5px]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Username</div>
            <div className="mt-0.5 font-semibold text-ink-900">{me.username}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Role</div>
            <div className="mt-0.5 font-semibold capitalize text-ink-900">{me.role}</div>
          </div>
          <div className="col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Email</div>
            <div className="mt-0.5 font-semibold text-ink-900">{me.email}</div>
          </div>
        </div>
        {insightsLink && (
          <div className="mt-3 border-t border-border pt-3">
            <Link to={insightsLink} className="text-xs font-semibold text-accent-dark hover:underline">
              View my academic profile →
            </Link>
          </div>
        )}
      </div>

      <ChangePasswordCard />

      {canManagePasswords && <AdminPasswordResetCard />}
    </div>
  );
}

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaved(false);
    if (next.length < 8) return setFormError('New password must be at least 8 characters.');
    if (next !== confirm) return setFormError('New passwords do not match.');

    changePassword.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: () => {
          setSaved(true);
          setCurrent('');
          setNext('');
          setConfirm('');
        }
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded border border-border bg-surface p-5">
      <div className="mb-3 text-[15px] font-bold text-ink-900">Change Password</div>

      <Field label="Current Password">
        <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </Field>
      <Field label="New Password">
        <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Confirm New Password">
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>

      {(formError || changePassword.error) && (
        <div className="mb-3 text-xs font-semibold text-danger">{formError || changePassword.error.message}</div>
      )}
      {saved && <div className="mb-3 text-xs font-semibold text-success">Password changed.</div>}

      <button
        type="submit"
        disabled={changePassword.isPending || !current || !next || !confirm}
        className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
      >
        {changePassword.isPending ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  );
}

function AdminPasswordResetCard() {
  const { data: users } = useAllUsers({ enabled: true });
  const adminChangePassword = useAdminChangePassword();
  const [userId, setUserId] = useState(null);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [savedFor, setSavedFor] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSavedFor(null);
    if (!userId) return setFormError('Choose a user.');
    if (next.length < 8) return setFormError('New password must be at least 8 characters.');
    if (next !== confirm) return setFormError('Passwords do not match.');

    adminChangePassword.mutate(
      { userId, payload: { new_password: next } },
      {
        onSuccess: (data) => {
          setSavedFor(data.username);
          setUserId(null);
          setNext('');
          setConfirm('');
        }
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Reset a User's Password</div>
      <div className="mb-3 text-[12px] text-ink-500">
        Admin only — sets a new password for any user in this organisation without needing their current one.
      </div>

      <Field label="User">
        <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
      </Field>
      <Field label="New Password">
        <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Confirm New Password">
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>

      {(formError || adminChangePassword.error) && (
        <div className="mb-3 text-xs font-semibold text-danger">{formError || adminChangePassword.error.message}</div>
      )}
      {savedFor && <div className="mb-3 text-xs font-semibold text-success">Password reset for {savedFor}.</div>}

      <button
        type="submit"
        disabled={adminChangePassword.isPending || !userId || !next || !confirm}
        className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
      >
        {adminChangePassword.isPending ? 'Saving…' : 'Reset Password'}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
    </label>
  );
}
