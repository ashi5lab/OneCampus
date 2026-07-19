import { useState } from 'react';
import { useInbox, useSentMessages, useMarkMessageRead } from '../hooks/useMessages';
import { ComposeMessageModal } from './ComposeMessageModal';

const TABS = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'sent', label: 'Sent' }
];

export function MessagesPage() {
  const [tab, setTab] = useState('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const inbox = useInbox();
  const sent = useSentMessages();
  const markRead = useMarkMessageRead();

  const { data, isLoading, error } = tab === 'inbox' ? inbox : sent;

  function handleExpand(msg) {
    setExpandedId(expandedId === msg.id ? null : msg.id);
    if (tab === 'inbox' && !msg.is_read) {
      markRead.mutate(msg.id);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Messages</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Messages</h1>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
        >
          + Compose
        </button>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setExpandedId(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {data && data.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          {tab === 'inbox' ? 'No messages yet.' : "You haven't sent any messages yet."}
        </div>
      )}

      <div className="space-y-2">
        {(data || []).map((msg) => (
          <div key={msg.id} className="overflow-hidden rounded border border-border bg-surface">
            <button onClick={() => handleExpand(msg)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {tab === 'inbox' && !msg.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />}
                  <span className="truncate text-[13.5px] font-semibold text-ink-900">
                    {tab === 'inbox' ? msg.sender_username : msg.recipient_username}
                  </span>
                  <span className="flex-shrink-0 text-[11px] capitalize text-ink-500">
                    ({tab === 'inbox' ? msg.sender_role : msg.recipient_role})
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[13px] text-ink-700">{msg.subject || '(no subject)'}</div>
              </div>
              <div className="flex-shrink-0 text-[11px] text-ink-500">{new Date(msg.created_at).toLocaleDateString()}</div>
            </button>
            {expandedId === msg.id && (
              <div className="whitespace-pre-wrap border-t border-border px-4 py-3 text-[13.5px] text-ink-900">
                {msg.body}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCompose && <ComposeMessageModal onClose={() => setShowCompose(false)} />}
    </div>
  );
}
