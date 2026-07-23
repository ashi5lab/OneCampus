import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { useAllUsers, useAdminChangePassword, useForceLogoutUser } from '../../profile/hooks/useProfile';

export function AdminToolsPage() {
  const { can } = useAuth();
  const canManagePasswords = can('users.manage_passwords');

  if (!canManagePasswords) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-500">
        You do not have permission to access Admin Tools.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <PageHeader eyebrows="Admin" title="Admin Tools" />
      
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">🛡️</span>
            Institutional Security Controls
          </h2>
          <p className="mt-1 text-xs text-ink-500 font-medium">Manage user credentials and active security sessions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminPasswordResetForm />
          <div className="border-t border-border pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <ForceLogoutForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPasswordResetForm() {
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
    <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
      <div>
        <div className="mb-1 text-sm font-bold text-ink-900">Reset User Password</div>
        <div className="mb-4 text-[11px] text-ink-500 font-semibold leading-relaxed">
          Sets a new password for any user without needing their current password verification.
        </div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Select User</div>
          <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
        </label>
        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">New Password</div>
          <input type="password" className="input text-xs" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Confirm Password</div>
          <input type="password" className="input text-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
      </div>

      <div>
        {(formError || adminChangePassword.error) && (
          <div className="mb-3 text-xs font-semibold text-danger">{formError || adminChangePassword.error.message}</div>
        )}
        {savedFor && <div className="mb-3 text-xs font-semibold text-success">Password reset for {savedFor}.</div>}

        <button
          type="submit"
          disabled={adminChangePassword.isPending || !userId || !next || !confirm}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-ink disabled:opacity-60 w-full"
        >
          {adminChangePassword.isPending ? 'Saving…' : 'Reset Password'}
        </button>
      </div>
    </form>
  );
}

function ForceLogoutForm() {
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
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="mb-1 text-sm font-bold text-ink-900">Force User Session Logout</div>
        <div className="mb-4 text-[11px] text-ink-500 font-semibold leading-relaxed">
          Disconnects the selected user's session on every device immediately.
        </div>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Select User</div>
          <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
        </label>
      </div>

      <div className="mt-8">
        {forceLogout.error && <div className="mb-3 text-xs font-semibold text-danger">{forceLogout.error.message}</div>}
        {doneFor && <div className="mb-3 text-xs font-semibold text-success">{doneFor} logged out.</div>}

        <button
          type="button"
          onClick={handleClick}
          disabled={forceLogout.isPending || !userId}
          className="rounded-lg border border-danger px-4 py-2 text-xs font-bold text-danger disabled:opacity-60 w-full hover:bg-danger hover:text-white transition-all duration-200"
        >
          {forceLogout.isPending ? 'Logging out…' : 'Force Logout'}
        </button>
      </div>
    </div>
  );
}
