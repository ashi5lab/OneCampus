import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { useBroadcasts, useSendAppNotification } from '../hooks/useBroadcast';
import { useAllUsers } from '../../profile/hooks/useProfile';
import { Badge } from '../../../components/Badge';
import { AudienceMultiSelect, resolveAudienceIds } from './AudienceMultiSelect';

export function AppNotificationTab() {
  const { can, user } = useAuth();
  const { t } = useConfig();
  const { data: history, isLoading, error } = useBroadcasts('app_notification');
  const { data: allUsers = [] } = useAllUsers();
  const sendNotification = useSendAppNotification();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Defaults to "All Users" — the picker also allows narrowing to specific
  // role groups (Students, Teachers, Guardians, Staff, Admins) or individual
  // people; see AudienceMultiSelect for the token format and mutual-exclusivity rules.
  const [audience, setAudience] = useState(['all']);
  const [sentSummary, setSentSummary] = useState(null);

  const effectiveRecipientIds = resolveAudienceIds(audience, allUsers);

  function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || effectiveRecipientIds.length === 0) {
      return;
    }

    setSentSummary(null);
    sendNotification.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        recipient_ids: effectiveRecipientIds
      },
      {
        onSuccess: (data) => {
          setSentSummary({
            sent: data.sent || effectiveRecipientIds.length,
            message: data.message || `Sent to ${effectiveRecipientIds.length} recipient(s)`
          });
          setTitle('');
          setBody('');
          setAudience(['all']);
        }
      }
    );
  }

  const columns = [
    {
      key: 'created_at',
      header: 'Sent',
      render: (row) => new Date(row.created_at).toLocaleString()
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => <span className="font-semibold">{row.title}</span>
    },
    {
      key: 'body',
      header: 'Message',
      render: (row) => <span className="line-clamp-2 text-sm">{row.body}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="active">Sent</Badge>
    },
    {
      key: 'by',
      header: 'By',
      render: (row) => row.created_by_username || '—'
    }
  ];

  return (
    <div>
      {can('broadcast.manage') && (
        <form onSubmit={handleSend} className="mb-5 rounded border border-border bg-surface p-4">
          <div className="mb-3 text-[15px] font-bold text-ink-900">Send an In-App Notification</div>

          <label className="mb-3 block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Title</div>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title (e.g., 'Attendance Alert')"
              maxLength={100}
            />
            <div className="mt-1 text-[11px] text-ink-500">{title.length}/100</div>
          </label>

          <label className="mb-3 block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Message</div>
            <textarea
              rows={3}
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification message…"
              maxLength={300}
            />
            <div className="mt-1 text-[11px] text-ink-500">{body.length}/300</div>
          </label>

          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold text-ink-700">Send to</div>
            <AudienceMultiSelect
              users={allUsers}
              value={audience}
              onChange={setAudience}
              t={t}
              placeholder="Search groups (Students, Teachers…) or specific users…"
            />
            <div className="mt-1 text-[11px] text-ink-500">
              {effectiveRecipientIds.length} recipient(s) will receive this notification
            </div>
          </div>

          {sendNotification.error && (
            <div className="mb-3 text-xs font-semibold text-danger">{sendNotification.error.message}</div>
          )}

          {sentSummary && (
            <div className="mb-3 rounded bg-success/10 p-2 text-xs font-semibold text-success">
              ✓ {sentSummary.message}
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || !body.trim() || effectiveRecipientIds.length === 0 || sendNotification.isPending}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendNotification.isPending ? 'Sending…' : 'Send Notification'}
          </button>
        </form>
      )}

      {/* History table */}
      <div className="rounded border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="text-[13px] font-bold text-ink-900">Sent Notifications</div>
        </div>

        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-ink-500">Loading…</div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-sm text-danger">Failed to load history</div>
        ) : !history || history.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ink-500">No notifications sent yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-surface-muted">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left font-semibold text-ink-700">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-surface-muted hover:bg-surface-muted">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
