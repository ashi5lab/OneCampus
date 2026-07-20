import { useState } from 'react';
import { Avatar } from '../../../components/Avatar';
import { MessageComposer } from './MessageComposer';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😠'];
const STAFF_ROLES = ['instructor', 'staff', 'admin'];

function formatWhen(iso) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function AttachmentCard({ url, name, size, type }) {
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block w-max">
        <img src={url} alt={name} className="max-h-40 rounded-lg border border-border object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 hover:border-accent"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-danger/10 text-[9px] font-extrabold uppercase text-danger">
        {type}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-semibold text-ink-900">{name}</span>
        <span className="block text-[10px] text-ink-500">{Math.round(size / 1024)} KB</span>
      </span>
    </a>
  );
}

// Renders one post or reply, plus every action on it — react, reply
// (posts only), edit (own message), pin/unpin (moderator, posts only),
// delete (own or moderator), view edit history (moderator, only when
// edited). A persistent small action row rather than a hover-only
// floating toolbar — more reliable on touch devices, which is most of
// this app's traffic.
export function MessagePost({
  message,
  kind,
  currentUserId,
  canModerate,
  members,
  isPinned,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onUnpin,
  onViewHistory
}) {
  const [editing, setEditing] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const isOwn = message.author_id === currentUserId;
  const canEdit = isOwn;
  const canDelete = isOwn || canModerate;
  const displayName = `${message.author_first_name || ''} ${message.author_last_name || ''}`.trim() || message.author_username;

  if (editing) {
    return (
      <div className="py-2">
        <MessageComposer
          members={members}
          initialHtml={message.body}
          placeholder="Edit your message…"
          submitLabel="Save"
          showAttach={false}
          autoFocus
          onCancel={() => setEditing(false)}
          onSubmit={async ({ html }) => {
            await onEdit(html);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`chat-post-row group relative flex gap-2.5 rounded-lg px-1.5 py-2 hover:bg-surface-muted/60 ${isPinned ? 'bg-amber-50/60' : ''}`}>
      <Avatar name={displayName} src={message.author_profile_picture_url} size={30} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-900">{displayName}</span>
          <span className="font-mono text-[10.5px] text-ink-500">({message.author_username})</span>
          {STAFF_ROLES.includes(message.author_role) ? (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9.5px] font-bold text-accent-dark">Teacher</span>
          ) : (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[9.5px] font-bold text-ink-500">Student</span>
          )}
          <span className="ml-auto flex-shrink-0 text-[10.5px] text-ink-500">{formatWhen(message.created_at)}</span>
        </div>

        <div className="msg-body mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-700" dangerouslySetInnerHTML={{ __html: message.body }} />

        {message.attachment_url && (
          <AttachmentCard url={message.attachment_url} name={message.attachment_name} size={message.attachment_size} type={message.attachment_type} />
        )}

        {kind === 'post' && message.reactions?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  message.my_reaction === r.emoji ? 'border-accent/30 bg-accent/10 text-accent-dark' : 'border-border bg-surface-muted text-ink-700'
                }`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        <div className="relative mt-1 flex flex-wrap items-center gap-3">
          {kind === 'post' && (
            <div className="relative">
              <button onClick={() => setShowReactions((v) => !v)} className="text-[11px] font-semibold text-ink-500 hover:text-accent-dark">
                React
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lg">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(emoji);
                        setShowReactions(false);
                      }}
                      className="rounded-full p-1 text-[16px] hover:scale-125 hover:bg-surface-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {kind === 'post' && onReply && (
            <button onClick={onReply} className="text-[11px] font-semibold text-ink-500 hover:text-accent-dark">
              Reply
            </button>
          )}
          {canEdit && (
            <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-ink-500 hover:text-accent-dark">
              Edit
            </button>
          )}
          {kind === 'post' && canModerate && (
            <button onClick={isPinned ? onUnpin : onPin} className="text-[11px] font-semibold text-ink-500 hover:text-amber-700">
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                if (window.confirm('Remove this message? It will be hidden from the chat.')) onDelete();
              }}
              className="text-[11px] font-semibold text-ink-500 hover:text-danger"
            >
              Delete
            </button>
          )}
          {message.is_edited && (
            <button
              onClick={canModerate ? onViewHistory : undefined}
              className={`text-[10.5px] font-semibold ${canModerate ? 'cursor-pointer text-ink-500 underline decoration-dotted hover:text-accent-dark' : 'cursor-default text-ink-500'}`}
              title={canModerate ? 'View edit history' : 'Only admins and teachers can view edit history'}
            >
              edited
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
