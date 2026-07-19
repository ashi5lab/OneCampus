import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import {
  useMyProfile,
  useChangePassword,
  useAllUsers,
  useAdminChangePassword,
  useForceLogoutUser,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  MY_PROFILE_KEY
} from '../hooks/useProfile';

const TABS = [
  { key: 'notifications', label: 'Notification Preferences' },
  { key: 'password', label: 'Change Password' },
  { key: 'display', label: 'Display' },
  { key: 'admin', label: 'Admin', adminOnly: true }
];

// Every authenticated user's own account screen (reached by clicking the
// avatar/name in the sidebar) — a settings page with vertical tabs.
// Notification Preferences is the default tab (not password change), since
// it's the one every role is most likely to actually want to touch.
// Force-logout and admin password reset are grouped into one "Admin" tab
// (users.manage_passwords) rather than kept as standalone cards.
// Mobile rows (no "Admin" bucket — Manage Dashboard Apps links straight
// out, and admin password tools get their own row) — matches the
// redesign mock's plain navigable list, distinct from the desktop
// tab-strip layout below it.
const MOBILE_ROWS = [
  { key: 'notifications', label: 'Notification Preferences' },
  { key: 'password', label: 'Change Password' },
  { key: 'display', label: 'Display' },
  { key: 'dashboard-apps', label: 'Manage Dashboard Apps', adminOnly: true, to: '/app/manage-dashboard-apps' },
  { key: 'admin-tools', label: 'Admin Tools', adminOnly: true }
];

export function ProfilePage() {
  const { can, profile, logout } = useAuth();
  const { data: me, isLoading, error } = useMyProfile();
  const canManagePasswords = can('users.manage_passwords');
  const [tab, setTab] = useState('notifications');
  const [mobileSection, setMobileSection] = useState(null);

  // Learners/instructors also have an academic profile page (marks,
  // attendance, insights) — link across to it from the account screen.
  const insightsLink = profile?.learnerId
    ? `/app/learners/${profile.learnerId}`
    : profile?.instructorId
      ? `/app/instructors/${profile.instructorId}`
      : null;

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const visibleTabs = TABS.filter((t) => !t.adminOnly || canManagePasswords);
  const activeTab = visibleTabs.find((t) => t.key === tab) ? tab : 'notifications';
  const visibleMobileRows = MOBILE_ROWS.filter((r) => !r.adminOnly || canManagePasswords);
  const activeMobileRow = MOBILE_ROWS.find((r) => r.key === mobileSection);

  return (
    <div className="max-w-[860px]">
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Account</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Settings</h1>
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

      {/* Mobile: a plain navigable list — tapping a row swaps in that
          panel with a back row above it, rather than the desktop's
          always-visible side-by-side tab strip. */}
      <div className="md:hidden">
        {!activeMobileRow && (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {visibleMobileRows.map((row, i) => (
              row.to ? (
                <Link
                  key={row.key}
                  to={row.to}
                  className={`flex items-center justify-between px-4 py-3.5 text-[13.5px] font-semibold text-accent-dark ${i > 0 ? 'border-t border-surface-muted' : ''}`}
                >
                  {row.label}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-ink-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ) : (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => setMobileSection(row.key)}
                  className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-[13.5px] font-semibold text-accent-dark ${i > 0 ? 'border-t border-surface-muted' : ''}`}
                >
                  {row.label}
                </button>
              )
            ))}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-between border-t border-surface-muted px-4 py-3.5 text-left text-[13.5px] font-semibold text-danger"
            >
              Log out
            </button>
          </div>
        )}

        {activeMobileRow && (
          <div>
            <button
              type="button"
              onClick={() => setMobileSection(null)}
              className="mb-3 flex items-center gap-1 text-[12.5px] font-semibold text-ink-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {activeMobileRow.label}
            </button>
            {mobileSection === 'notifications' && <NotificationPreferencesCard />}
            {mobileSection === 'password' && <ChangePasswordCard />}
            {mobileSection === 'display' && <DisplayCard />}
            {mobileSection === 'admin-tools' && canManagePasswords && (
              <div className="space-y-5">
                <AdminPasswordResetCard />
                <ForceLogoutCard />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop: side-by-side tab strip + content, everything visible at once. */}
      <div className="hidden gap-5 md:flex">
        <div className="flex w-[190px] flex-shrink-0 flex-col gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                activeTab === t.key ? 'bg-accent/15 text-accent-dark' : 'text-ink-700 hover:bg-surface-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === 'notifications' && <NotificationPreferencesCard />}
          {activeTab === 'password' && <ChangePasswordCard />}
          {activeTab === 'display' && <DisplayCard />}
          {activeTab === 'admin' && canManagePasswords && (
            <div className="space-y-5">
              <ManageSidebarCard />
              <AdminPasswordResetCard />
              <ForceLogoutCard />
            </div>
          )}
        </div>
      </div>
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
    <form onSubmit={handleSubmit} className="rounded border border-border bg-surface p-5">
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

// broadcast_opt_out on onec_users defaults to false (opted in) — flip the
// sense here so the checkbox reads as "receive broadcasts" rather than
// "opt out of broadcasts", which is the natural framing for a user-facing
// toggle even though the column itself is stored as an opt-out.
function NotificationPreferencesCard() {
  const { data: prefs, isLoading, error } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  if (isLoading || error) return null;

  const receivesBroadcast = !prefs.broadcast_opt_out;
  const showWhatsapp = prefs.whatsapp_opt_in !== null;

  return (
    <div className="rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Notification Preferences</div>
      <div className="mb-3 text-[12px] text-ink-500">Control which broadcast channels you receive.</div>

      <label className="mb-3 flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={receivesBroadcast}
          disabled={updatePrefs.isPending}
          onChange={(e) => updatePrefs.mutate({ broadcast_opt_out: !e.target.checked })}
        />
        <span className="text-[13px] text-ink-700">
          Receive SMS &amp; voicemail broadcasts sent to me
        </span>
      </label>

      {showWhatsapp && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={prefs.whatsapp_opt_in}
            disabled={updatePrefs.isPending}
            onChange={(e) => updatePrefs.mutate({ whatsapp_opt_in: e.target.checked })}
          />
          <span className="text-[13px] text-ink-700">
            Receive WhatsApp attendance alerts for my linked children
          </span>
        </label>
      )}

      {updatePrefs.error && <div className="mt-3 text-xs font-semibold text-danger">{updatePrefs.error.message}</div>}
    </div>
  );
}

// The slider applies live (via ConfigContext's zoom effect, same
// instant-apply pattern as the theme switcher) rather than needing a Save
// button — there's no server round-trip, it's a per-device localStorage
// preference. The preview block below is styled directly from fontScale
// rather than relying on the reader noticing the whole page just resized,
// so there's still an explicit "here's what this looks like" reference.
function DisplayCard() {
  const { fontScale, setFontScale, defaultFontScale } = useConfig();

  return (
    <div className="rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Text Size</div>
      <div className="mb-4 text-[12px] text-ink-500">
        Adjust the size of text throughout the app. Applies immediately and is remembered on this device.
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink-500">Smaller</span>
        <span className="text-[13px] font-bold text-ink-900">{fontScale}%</span>
        <span className="text-[11px] font-semibold text-ink-500">Larger</span>
      </div>
      <input
        type="range"
        min={85}
        max={140}
        step={5}
        value={fontScale}
        onChange={(e) => setFontScale(Number(e.target.value))}
        className="w-full accent-accent"
      />

      {fontScale !== defaultFontScale && (
        <button
          type="button"
          onClick={() => setFontScale(defaultFontScale)}
          className="mt-3 text-[11px] font-semibold text-accent-dark hover:underline"
        >
          Reset to default (100%)
        </button>
      )}

      <div className="mt-5 rounded border border-border bg-surface-muted p-4">
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Preview</div>
        <div style={{ fontSize: `${(15 * fontScale) / 100}px` }} className="font-bold text-ink-900">
          Sample Heading
        </div>
        <div style={{ fontSize: `${(13 * fontScale) / 100}px` }} className="mt-1 text-ink-700">
          This is how regular text will look across the app at this size.
        </div>
        <button
          type="button"
          style={{ fontSize: `${(12 * fontScale) / 100}px` }}
          className="mt-3 rounded bg-accent px-3 py-1.5 font-semibold text-accent-ink"
        >
          Sample Button
        </button>
      </div>
    </div>
  );
}

// Tenant-wide dashboard customization lives on its own page (the picker
// over every optional module doesn't fit this card-stack layout) — this is
// just the entry point into it, grouped with the other admin-only actions.
function ManageSidebarCard() {
  return (
    <div className="rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Manage Dashboard Apps</div>
      <div className="mb-3 text-[12px] text-ink-500">
        Admin only — choose which modules appear on the Home dashboard for everyone in your organisation.
      </div>
      <Link
        to="/app/manage-dashboard-apps"
        className="inline-block rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
      >
        Manage Dashboard Apps
      </Link>
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

// A logged-in session now lasts effectively indefinitely (see server/
// config/env.js's REFRESH_TOKEN_TTL_DAYS) — it only ends when the
// password changes or someone force-logs-out the account here. This is
// the "someone force-logs-out the account" half: doesn't touch the
// password, just ends every device that user is currently logged in on
// (lost/stolen device, suspicious activity, offboarding).
function ForceLogoutCard() {
  const { data: users } = useAllUsers({ enabled: true });
  const forceLogout = useForceLogoutUser();
  const [userId, setUserId] = useState(null);
  const [doneFor, setDoneFor] = useState(null);

  function handleClick() {
    if (!userId) return;
    const target = (users || []).find((u) => u.id === userId);
    if (!window.confirm(`Log out ${target?.username || 'this user'} everywhere? They'll need to sign in again on every device.`)) return;

    setDoneFor(null);
    forceLogout.mutate(userId, {
      onSuccess: (data) => {
        setDoneFor(data.username);
        setUserId(null);
      }
    });
  }

  return (
    <div className="rounded border border-border bg-surface p-5">
      <div className="mb-1 text-[15px] font-bold text-ink-900">Force Logout</div>
      <div className="mb-3 text-[12px] text-ink-500">
        Admin only — ends a user's session on every device immediately, without changing their password.
      </div>

      <Field label="User">
        <UserSearchSelect users={users || []} value={userId} onChange={setUserId} placeholder="Search users…" />
      </Field>

      {forceLogout.error && <div className="mb-3 text-xs font-semibold text-danger">{forceLogout.error.message}</div>}
      {doneFor && <div className="mb-3 text-xs font-semibold text-success">{doneFor} has been logged out everywhere.</div>}

      <button
        type="button"
        onClick={handleClick}
        disabled={forceLogout.isPending || !userId}
        className="rounded border border-danger px-4 py-2 text-xs font-semibold text-danger disabled:opacity-60"
      >
        {forceLogout.isPending ? 'Logging out…' : 'Force Logout'}
      </button>
    </div>
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
