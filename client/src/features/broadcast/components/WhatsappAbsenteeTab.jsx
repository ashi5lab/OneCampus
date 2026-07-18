import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBroadcasts, useSendAbsenteeAlertsNow } from '../hooks/useBroadcast';

const MODE_LABEL = { manual: 'On click only', daily: 'Automatically every day', weekly: 'Automatically once a week' };

// Sends as one batched digest per day, not one call per learner (testing
// phase — see server/lib/absenteeDigest.js), triggered either by the
// button below or the scheduler (server/lib/absenteeScheduler.js)
// depending on the mode chosen in "Configure WhatsApp API" above.
//
// `config` comes from BroadcastPage (which already fetches it, gated by
// broadcast.configure — admin-only) rather than fetched here again, so a
// caller with broadcast.manage but not broadcast.configure (e.g. an
// instructor) doesn't 403 just from opening this tab; the mode banner
// just falls back to the "On click only" default when it's undefined.
export function WhatsappAbsenteeTab({ config }) {
  const { can } = useAuth();
  const { data: history, isLoading, error } = useBroadcasts('whatsapp_absentee');
  const sendNow = useSendAbsenteeAlertsNow();
  const [result, setResult] = useState(null);

  const mode = config?.absentee_mode || 'manual';

  function handleSendNow() {
    setResult(null);
    sendNow.mutate(undefined, { onSuccess: (data) => setResult(data) });
  }

  const columns = [
    { key: 'sent_at', header: 'Sent', render: (row) => new Date(row.sent_at || row.created_at).toLocaleString() },
    { key: 'message', header: 'Notification', render: (row) => row.message },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'sent' ? 'active' : 'inactive'}>{row.status}</Badge>
    },
    {
      key: 'result',
      header: 'Result',
      render: (row) =>
        row.send_result ? (
          <div>
            {row.send_result.sent} sent · {row.send_result.failed} failed
            {row.send_result.last_error && <div className="mt-0.5 text-[11px] text-danger">{row.send_result.last_error}</div>}
          </div>
        ) : (
          '—'
        )
    }
  ];

  return (
    <div>
      <div className="mb-4 rounded border border-border bg-surface-muted p-4 text-[13px] text-ink-700">
        <strong>Mode: {MODE_LABEL[mode]}.</strong> Every learner marked absent today is batched into a single test
        WhatsApp send — not one message per absentee — since the tenant is still on a test number/template. Change
        the mode in "Configure WhatsApp API" above.
      </div>

      {can('broadcast.manage') && (
        <div className="mb-5 rounded border border-border bg-surface p-4">
          <div className="mb-2 text-[15px] font-bold text-ink-900">Send Absentee Alerts Now</div>
          <div className="mb-3 text-[12px] text-ink-500">
            Sends today's absentee digest immediately, regardless of the configured mode.
          </div>
          <button
            type="button"
            onClick={handleSendNow}
            disabled={sendNow.isPending}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendNow.isPending ? 'Sending…' : 'Send Absentee Alerts Now'}
          </button>
          {sendNow.error && <div className="mt-3 text-xs font-semibold text-danger">{sendNow.error.message}</div>}
          {result && (
            <div className={`mt-3 text-xs font-semibold ${result.failed > 0 ? 'text-danger' : 'text-success'}`}>
              {result.note}
              {result.last_error && <div className="mt-1 font-mono text-[11px]">{result.last_error}</div>}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {history && <DataTable columns={columns} rows={history} rowKey={(row) => row.id} emptyMessage="No WhatsApp notifications sent yet." />}
      </div>
    </div>
  );
}
