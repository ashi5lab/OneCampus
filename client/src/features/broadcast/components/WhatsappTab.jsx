import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBroadcasts, useSendWhatsapp } from '../hooks/useBroadcast';
import { AudiencePicker } from './AudiencePicker';
import { audienceLabel } from './SmsTab';

const EMPTY_AUDIENCE = { audience_type: 'all', audience_ids: [] };

// Testing-phase only: the message box below is inert (see draftMessage)
// because the configured template (e.g. Meta's sample "hello_world", or a
// Twilio Content template referenced by ContentSid) takes no free-form
// text — there's nowhere for typed text to go yet. Once a real approved
// template with a body variable is configured, wire draftMessage into the
// send payload's {{message}}-equivalent the same way SmsTab does.
// The audience picker is real and fully wired, but the actual send always
// goes to one number (the WhatsApp config's "test_phone" Variable) — see
// the comment on sendWhatsapp in server/modules/broadcast/controller.js.
export function WhatsappTab() {
  const { can } = useAuth();
  const { data: history, isLoading, error } = useBroadcasts('whatsapp');
  const sendWhatsapp = useSendWhatsapp();

  const [audience, setAudience] = useState(EMPTY_AUDIENCE);
  const [sentSummary, setSentSummary] = useState(null);
  // Deliberately not sent anywhere — WhatsApp requires a pre-approved
  // template for anything business-initiated, so free-form text has
  // nowhere to go yet in test phase. Kept purely so the form doesn't look
  // broken/incomplete; once a real template with a body variable is wired
  // up, this becomes the {{message}}-equivalent value in the payload.
  const [draftMessage, setDraftMessage] = useState('');

  function handleSend(e) {
    e.preventDefault();
    setSentSummary(null);
    sendWhatsapp.mutate(audience, {
      onSuccess: (data) => {
        setSentSummary(data.send_result);
        setAudience(EMPTY_AUDIENCE);
      }
    });
  }

  const columns = [
    { key: 'created_at', header: 'Sent', render: (row) => new Date(row.sent_at || row.created_at).toLocaleString() },
    { key: 'message', header: 'Template', render: (row) => row.message },
    { key: 'audience', header: 'Audience Selected', render: (row) => audienceLabel(row) },
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
        <strong>Testing phase:</strong> every send below goes to the single "test_phone" number set in the Configuration
        panel, no matter which audience you pick here — a test provider number/template can only message a handful of
        verified numbers. The message box is inert for now (the configured template takes no free-form text). The
        audience you pick is still recorded for reference.
      </div>

      {can('broadcast.manage') && (
        <form onSubmit={handleSend} className="mb-5 rounded border border-border bg-surface p-4">
          <div className="mb-3 text-[15px] font-bold text-ink-900">Send a WhatsApp Message</div>
          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold text-ink-700">Send to</div>
            <AudiencePicker value={audience} onChange={setAudience} />
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold text-ink-700">Message (not sent yet)</div>
            <textarea
              className="input w-full"
              rows={2}
              placeholder="Free-form text isn't sent yet — testing phase uses a pre-approved template with no variables"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
            />
          </div>

          {sendWhatsapp.error && <div className="mb-3 text-xs font-semibold text-danger">{sendWhatsapp.error.message}</div>}
          {sentSummary && (
            <div className={`mb-3 text-xs font-semibold ${sentSummary.failed > 0 ? 'text-danger' : 'text-success'}`}>
              Done — {sentSummary.sent} sent, {sentSummary.failed} failed. {sentSummary.note}
              {sentSummary.last_error && <div className="mt-1 font-mono text-[11px]">{sentSummary.last_error}</div>}
            </div>
          )}

          <button
            type="submit"
            disabled={sendWhatsapp.isPending}
            className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendWhatsapp.isPending ? 'Sending…' : 'Send WhatsApp'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {history && <DataTable columns={columns} rows={history} rowKey={(row) => row.id} emptyMessage="No WhatsApp messages sent yet." />}
      </div>
    </div>
  );
}
