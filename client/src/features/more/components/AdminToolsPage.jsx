import { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { Avatar } from '../../../components/Avatar';
import { useAllUsers, useAdminChangePassword, useForceLogoutUser } from '../../profile/hooks/useProfile';
import { useUsersReport, useChangeUserRole, useAssignLearnerCohort } from '../../admin/hooks/useAdminReport';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import {
  Users, ShieldCheck, Search, X, ChevronDown,
  AlertCircle, CheckCircle2, BookOpen, UserCog
} from 'lucide-react';

const TABS = [
  { id: 'report', label: 'Users Report', icon: Users },
  { id: 'security', label: 'Security Controls', icon: ShieldCheck }
];

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  instructor: 'bg-blue-100 text-blue-700',
  staff: 'bg-amber-100 text-amber-700',
  learner: 'bg-green-100 text-green-700',
  guardian: 'bg-pink-100 text-pink-700'
};

const FILTERS = [
  { id: 'all', label: 'All Users' },
  { id: 'no_profile', label: 'Missing Profile' },
  { id: 'learners_no_class', label: 'Students without Class' },
  { id: 'instructors_no_class', label: 'Teachers without Class' }
];

export function AdminToolsPage() {
  const { can } = useAuth();
  const canManage = can('users.manage_passwords');
  const [activeTab, setActiveTab] = useState('report');

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-500">
        You do not have permission to access Admin Tools.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <PageHeader eyebrows="Admin" title="Admin Tools" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-surface-muted rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === id
                ? 'bg-surface text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'report' ? <UsersReportTab /> : <SecurityControlsTab />}
    </div>
  );
}

// ─── Users Report Tab ────────────────────────────────────────────────────────

function UsersReportTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editUser, setEditUser] = useState(null);

  function handleSearch(v) {
    setSearch(v);
    clearTimeout(window._adminSearchTimer);
    window._adminSearchTimer = setTimeout(() => setDebouncedSearch(v), 300);
  }

  const { data, isLoading } = useUsersReport({ search: debouncedSearch, filter });
  const summary = data?.summary ?? {};
  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Users"
          value={summary.total ?? '—'}
          color="text-ink-900"
          bg="bg-surface"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <SummaryCard
          label="Missing Profile"
          value={summary.no_profile ?? '—'}
          color="text-red-600"
          bg="bg-red-50"
          onClick={() => setFilter('no_profile')}
          active={filter === 'no_profile'}
        />
        <SummaryCard
          label="Students without Class"
          value={summary.learners_no_class ?? '—'}
          color="text-amber-600"
          bg="bg-amber-50"
          onClick={() => setFilter('learners_no_class')}
          active={filter === 'learners_no_class'}
        />
        <SummaryCard
          label="Teachers without Class"
          value={summary.instructors_no_class ?? '—'}
          color="text-blue-600"
          bg="bg-blue-50"
          onClick={() => setFilter('instructors_no_class')}
          active={filter === 'instructors_no_class'}
        />
      </div>

      {/* Search + filter chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, username, or admission number…"
            className="input pl-9 text-sm w-full"
          />
          {search && (
            <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-accent text-accent-ink'
                  : 'bg-surface border border-border text-ink-500 hover:text-ink-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-ink-400">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-400">No users match the current filter.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <UserRow key={u.user_id} user={u} onEdit={() => setEditUser(u)} />
            ))}
          </div>
        )}
      </div>

      {editUser && (
        <UserEditModal user={editUser} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-4 text-left transition-all ${bg} ${
        active ? 'ring-2 ring-accent shadow-md' : 'hover:shadow-sm'
      }`}
    >
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs font-semibold text-ink-500 mt-0.5">{label}</div>
    </button>
  );
}

function UserRow({ user, onEdit }) {
  const isOk = !user.is_profile_missing && user.has_class;
  const needsProfile = user.is_profile_missing;
  const needsClass = !user.is_profile_missing && !user.has_class && (user.role === 'learner' || user.role === 'instructor');

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors">
      <Avatar name={user.name} src={user.profile_picture_url} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink-900 truncate">{user.name}</span>
          <span className="text-xs text-ink-400">@{user.username}</span>
          {user.registry_no && (
            <span className="text-xs text-ink-400">· {user.registry_no}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
            {user.role}
          </span>
          {user.cohort_name ? (
            <span className="text-[11px] font-semibold text-ink-500 flex items-center gap-1">
              <BookOpen className="w-3 h-3" />{user.cohort_name}
            </span>
          ) : needsClass ? (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">No Class</span>
          ) : null}
          {needsProfile && (
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">No Profile</span>
          )}
          <span className="text-[11px] text-ink-300">ID: {user.user_id}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isOk ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-ink-600 hover:bg-surface-muted transition-colors"
        >
          <UserCog className="w-3.5 h-3.5" />
          Manage
        </button>
      </div>
    </div>
  );
}

function UserEditModal({ user, onClose }) {
  const { data: cohortsData } = useCohorts();
  const cohorts = cohortsData || [];
  const changeRole = useChangeUserRole();
  const assignCohort = useAssignLearnerCohort();
  const [selectedCohort, setSelectedCohort] = useState(user.cohort_id ?? '');
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canChangeRole = !user.learner_id && !user.instructor_id && !user.staff_id;

  function handleAssignCohort() {
    setError('');
    setSuccess('');
    assignCohort.mutate(
      { learnerId: user.learner_id, cohortId: selectedCohort ? Number(selectedCohort) : null },
      {
        onSuccess: () => { setSuccess('Class assigned.'); setTimeout(onClose, 1200); },
        onError: (e) => setError(e.message)
      }
    );
  }

  function handleChangeRole() {
    setError('');
    setSuccess('');
    changeRole.mutate(
      { userId: user.user_id, role: selectedRole },
      {
        onSuccess: () => { setSuccess('Role updated.'); setTimeout(onClose, 1200); },
        onError: (e) => setError(e.message)
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.profile_picture_url} size={48} />
          <div>
            <div className="text-base font-bold text-ink-900">{user.name}</div>
            <div className="text-xs text-ink-400">@{user.username} · ID {user.user_id}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-ink-400 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assign class — learners only */}
        {user.role === 'learner' && user.learner_id && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-ink-900">Assign to Class</div>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="input text-sm w-full"
            >
              <option value="">— No class —</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleAssignCohort}
              disabled={assignCohort.isPending}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:opacity-60"
            >
              {assignCohort.isPending ? 'Saving…' : 'Save Class'}
            </button>
          </div>
        )}

        {/* Role change — only for users with no profile */}
        <div className="space-y-2">
          <div className="text-sm font-bold text-ink-900">Change Role</div>
          {!canChangeRole ? (
            <p className="text-xs text-ink-500 bg-surface-muted rounded-lg p-3">
              Role cannot be changed while a role profile exists. Delete the learner/instructor/staff record for this user first, then return here to re-assign.
            </p>
          ) : (
            <>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input text-sm w-full"
              >
                {['admin', 'staff', 'instructor', 'learner', 'guardian'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={handleChangeRole}
                disabled={changeRole.isPending || selectedRole === user.role}
                className="w-full rounded-lg border border-accent px-4 py-2 text-sm font-bold text-accent disabled:opacity-60 hover:bg-accent hover:text-accent-ink transition-colors"
              >
                {changeRole.isPending ? 'Saving…' : 'Update Role'}
              </button>
            </>
          )}
        </div>

        {error && <div className="text-xs font-semibold text-danger">{error}</div>}
        {success && <div className="text-xs font-semibold text-success">{success}</div>}
      </div>
    </div>
  );
}

// ─── Security Controls Tab ───────────────────────────────────────────────────

function SecurityControlsTab() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <ShieldCheck className="w-4 h-4" />
          </span>
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
