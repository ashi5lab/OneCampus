import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useAllFeatureLinks } from '../../../hooks/useNavLinks';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { PageHeader } from '../../../components/PageHeader';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { useAllUsers, useAdminChangePassword, useForceLogoutUser } from '../../profile/hooks/useProfile';

// Full feature directory — every module this user can access, regardless
// of whether it's pinned to the Dashboard's "Your Modules" grid.
export function MorePage() {
  const { can } = useAuth();
  const links = useAllFeatureLinks();
  const [search, setSearch] = useState('');
  const canManagePasswords = can('users.manage_passwords');

  const filtered = search.trim()
    ? links.filter(
        (link) =>
          link.label.toLowerCase().includes(search.trim().toLowerCase()) ||
          link.description.toLowerCase().includes(search.trim().toLowerCase())
      )
    : links;

  return (
    <div className="max-w-[860px]">
      <PageHeader title="More Apps" />

      <div className="mb-5">
        <input
          className="input w-full"
          placeholder="Search all features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          No matching features.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {filtered.map((link) => (
            <Link
              key={link.key}
              to={link.to}
              className="flex items-center gap-3 rounded border border-border bg-surface p-3.5 transition hover:border-accent"
            >
              <ModuleBadge moduleKey={link.key} label={link.label} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-ink-900">{link.label}</div>
                <div className="truncate text-[12px] text-ink-500">{link.description}</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-ink-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {canManagePasswords && !search.trim() && (
        <div className="mt-8">
          <PageHeader title="Admin Tools" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AdminPasswordResetCard />
            <ForceLogoutCard />
          </div>
        </div>
      )}
    </div>
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
    <form onSubmit={handleSubmit} className="rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Reset Password</div>
      <div className="mb-4 text-[12px] text-ink-500">
        Sets a new password for any user without needing their current one.
      </div>

      <label className="mb-3 block">
        <div className="mb-1 text-xs font-semibold text-ink-700">User</div>
        <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
      </label>
      <label className="mb-3 block">
        <div className="mb-1 text-xs font-semibold text-ink-700">New Password</div>
        <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="mb-4 block">
        <div className="mb-1 text-xs font-semibold text-ink-700">Confirm Password</div>
        <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </label>

      {(formError || adminChangePassword.error) && (
        <div className="mb-3 text-xs font-semibold text-danger">{formError || adminChangePassword.error.message}</div>
      )}
      {savedFor && <div className="mb-3 text-xs font-semibold text-success">Password reset for {savedFor}.</div>}

      <button
        type="submit"
        disabled={adminChangePassword.isPending || !userId || !next || !confirm}
        className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60 w-full"
      >
        {adminChangePassword.isPending ? 'Saving…' : 'Reset Password'}
      </button>
    </form>
  );
}

function ForceLogoutCard() {
  const { data: users } = useAllUsers({ enabled: true });
  const forceLogout = useForceLogoutUser();
  const [userId, setUserId] = useState(null);
  const [doneFor, setDoneFor] = useState(null);

  function handleClick() {
    if (!userId) return;
    const target = (users || []).find((u) => u.id === userId);
    if (!window.confirm(`Log out ${target?.username || 'this user'} everywhere?`)) return;

    setDoneFor(null);
    forceLogout.mutate(userId, {
      onSuccess: (data) => {
        setDoneFor(data.username);
        setUserId(null);
      }
    });
  }

  return (
    <div className="rounded border border-border bg-surface p-5 flex flex-col">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Force Logout</div>
      <div className="mb-4 text-[12px] text-ink-500">
        Ends a user's session on every device immediately.
      </div>

      <label className="mb-4 block">
        <div className="mb-1 text-xs font-semibold text-ink-700">User</div>
        <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
      </label>

      <div className="mt-auto">
        {forceLogout.error && <div className="mb-3 text-xs font-semibold text-danger">{forceLogout.error.message}</div>}
        {doneFor && <div className="mb-3 text-xs font-semibold text-success">{doneFor} logged out.</div>}

        <button
          type="button"
          onClick={handleClick}
          disabled={forceLogout.isPending || !userId}
          className="rounded border border-danger px-4 py-2 text-xs font-semibold text-danger disabled:opacity-60 w-full hover:bg-danger hover:text-white transition"
        >
          {forceLogout.isPending ? 'Logging out…' : 'Force Logout'}
        </button>
      </div>
    </div>
  );
}
