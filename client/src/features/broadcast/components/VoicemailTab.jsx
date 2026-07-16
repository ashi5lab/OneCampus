import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBroadcasts, useApproveVoicemail, useRejectVoicemail, useSendVoicemail } from '../hooks/useBroadcast';
import { VoicemailRecorder } from './VoicemailRecorder';
import { AudiencePicker } from './AudiencePicker';
import { audienceLabel } from './SmsTab';

const STATUS_VARIANT = { pending_approval: 'pending', approved: 'active', rejected: 'inactive', sent: 'active' };
const STATUS_LABEL = { pending_approval: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected', sent: 'Sent' };

export function VoicemailTab() {
  const { can } = useAuth();
  const { data: voicemails, isLoading, error } = useBroadcasts('voicemail');
  const approveVoicemail = useApproveVoicemail();
  const rejectVoicemail = useRejectVoicemail();
  const [sharing, setSharing] = useState(null); // voicemail row being shared

  const canApprove = can('broadcast.approve');
  const canManage = can('broadcast.manage');

  const columns = [
    { key: 'created_at', header: 'Recorded', render: (row) => new Date(row.created_at).toLocaleString() },
    { key: 'by', header: 'By', render: (row) => row.created_by_username || '—' },
    {
      key: 'audio',
      header: 'Recording',
      render: (row) => <audio controls src={row.voice_url} className="h-8 max-w-[220px]" preload="none" />
    },
    { key: 'duration', header: 'Length', render: (row) => `${row.duration_seconds}s` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <Badge variant={STATUS_VARIANT[row.status] || 'pending'}>{STATUS_LABEL[row.status] || row.status}</Badge>
          {row.status === 'rejected' && row.rejection_reason && (
            <div className="mt-1 text-[11px] text-ink-500">{row.rejection_reason}</div>
          )}
          {row.status === 'sent' && row.send_result && (
            <div className="mt-1 text-[11px] text-ink-500">
              {audienceLabel(row)} · {row.send_result.sent} sent, {row.send_result.failed} failed
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          {canApprove && row.status === 'pending_approval' && (
            <>
              <button
                onClick={() => approveVoicemail.mutate(row.id)}
                className="text-xs font-semibold text-success hover:opacity-80"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = window.prompt('Reason for rejecting (optional):') ?? undefined;
                  rejectVoicemail.mutate({ id: row.id, reason });
                }}
                className="text-xs font-semibold text-danger hover:opacity-80"
              >
                Reject
              </button>
            </>
          )}
          {canManage && (row.status === 'approved' || row.status === 'sent') && (
            <button onClick={() => setSharing(row)} className="text-xs font-semibold text-accent-dark hover:underline">
              {row.status === 'sent' ? 'Share again' : 'Share'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      {canManage && <VoicemailRecorder />}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {voicemails && (
          <DataTable columns={columns} rows={voicemails} rowKey={(row) => row.id} emptyMessage="No voicemails recorded yet." />
        )}
      </div>

      {sharing && <ShareVoicemailModal voicemail={sharing} onClose={() => setSharing(null)} />}
    </div>
  );
}

function ShareVoicemailModal({ voicemail, onClose }) {
  const sendVoicemail = useSendVoicemail();
  const [audience, setAudience] = useState({ audience_type: 'all', audience_ids: [] });

  function handleSend(e) {
    e.preventDefault();
    sendVoicemail.mutate({ id: voicemail.id, payload: audience }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={handleSend} className="my-auto w-full max-w-[440px] rounded border border-border bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">Share Voicemail</div>
        <div className="mb-4 text-[12px] text-ink-500">
          Each recipient with a phone number on file gets a call via the configured voicemail API.
        </div>

        <audio controls src={voicemail.voice_url} className="mb-4 h-9 w-full" />

        <div className="mb-3">
          <div className="mb-1 text-xs font-semibold text-ink-700">Send to</div>
          <AudiencePicker value={audience} onChange={setAudience} />
        </div>

        {sendVoicemail.error && <div className="mb-3 text-xs font-semibold text-danger">{sendVoicemail.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={sendVoicemail.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendVoicemail.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
