import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBroadcasts, useSendSms } from '../hooks/useBroadcast';
import { AudiencePicker } from './AudiencePicker';

const EMPTY_AUDIENCE = { audience_type: 'all', audience_ids: [] };

export function SmsTab() {
  const { can } = useAuth();
  const { data: history, isLoading, error } = useBroadcasts('sms');
  const sendSms = useSendSms();

  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState(EMPTY_AUDIENCE);
  const [sentSummary, setSentSummary] = useState(null);

  function handleSend(e) {
    e.preventDefault();
    setSentSummary(null);
    sendSms.mutate(
      { message, ...audience },
      {
        onSuccess: (data) => {
          setSentSummary(data.send_result);
          setMessage('');
          setAudience(EMPTY_AUDIENCE);
        }
      }
    );
  }

  const columns = [
    { key: 'created_at', header: 'Sent', render: (row) => new Date(row.sent_at || row.created_at).toLocaleString() },
    { key: 'message', header: 'Message', render: (row) => <span className="line-clamp-2">{row.message}</span> },
    { key: 'audience', header: 'Audience', render: (row) => audienceLabel(row) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'sent' ? 'active' : 'inactive'}>{row.status}</Badge>
    },
    {
      key: 'result',
      header: 'Result',
      render: (row) =>
        row.send_result
          ? `${row.send_result.sent} sent · ${row.send_result.failed} failed · ${row.send_result.skipped_no_phone} no phone`
          : '—'
    },
    { key: 'by', header: 'By', render: (row) => row.created_by_username || '—' }
  ];

  return (
    <div>
      {can('broadcast.manage') && (
        <form onSubmit={handleSend} className="mb-5 rounded border border-border bg-surface p-4">
          <div className="mb-3 text-[15px] font-bold text-ink-900">Send an SMS</div>
          <label className="mb-3 block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Message</div>
            <textarea rows={3} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type the SMS text…" />
          </label>
          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold text-ink-700">Send to</div>
            <AudiencePicker value={audience} onChange={setAudience} />
          </div>

          {sendSms.error && <div className="mb-3 text-xs font-semibold text-danger">{sendSms.error.message}</div>}
          {sentSummary && (
            <div className="mb-3 text-xs font-semibold text-success">
              Done — {sentSummary.sent} sent, {sentSummary.failed} failed, {sentSummary.skipped_no_phone} skipped (no phone on file).
            </div>
          )}

          <button
            type="submit"
            disabled={sendSms.isPending || !message.trim()}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendSms.isPending ? 'Sending…' : 'Send SMS'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {history && <DataTable columns={columns} rows={history} rowKey={(row) => row.id} emptyMessage="No SMS broadcasts yet." />}
      </div>
    </div>
  );
}

export function audienceLabel(row) {
  if (row.audience_type === 'all') return 'All users';
  if (row.audience_type === 'cohort') return `Class/group #${(row.audience_ids || []).join(', #')}`;
  if (row.audience_type === 'users') return `${(row.audience_ids || []).length} specific user(s)`;
  return '—';
}
