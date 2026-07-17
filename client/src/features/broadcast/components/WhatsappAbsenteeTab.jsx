import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBroadcasts } from '../hooks/useBroadcast';

// No compose form here on purpose — WhatsApp requires a pre-approved
// message template for anything the school initiates, so this channel is
// automatic-only (see server/lib/whatsappNotify.js), triggered when a
// learner is newly marked absent. This tab is just the configuration entry
// point (shared ChannelConfigModal, same as SMS/voicemail) plus a read-only
// history of what's gone out.
export function WhatsappAbsenteeTab() {
  const { data: history, isLoading, error } = useBroadcasts('whatsapp_absentee');

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
      render: (row) => (row.send_result ? `${row.send_result.sent} sent · ${row.send_result.failed} failed` : '—')
    }
  ];

  return (
    <div>
      <div className="mb-4 rounded border border-border bg-surface-muted p-4 text-[13px] text-ink-700">
        Absentee alerts send automatically — there's no manual compose step here. When a learner is marked absent for the
        first time on a given day, every linked guardian who has opted in (see the Guardians page) and has a phone number
        on file gets a WhatsApp notification. Set up the API call via "Configure WhatsApp API" above first.
      </div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {history && <DataTable columns={columns} rows={history} rowKey={(row) => row.id} emptyMessage="No WhatsApp notifications sent yet." />}
      </div>
    </div>
  );
}
