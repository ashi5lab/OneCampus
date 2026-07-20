import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Avatar } from '../../../components/Avatar';
import { useClassPosts, useCreateClassPost, useCreateClassReply } from '../hooks/useClassChannel';

const STAFF_ROLES = ['instructor', 'staff', 'admin'];

export function ClassChatTab({ cohortId }) {
  const { data: posts, isLoading, error } = useClassPosts(cohortId);
  const createPost = useCreateClassPost(cohortId);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  function handleSend(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    createPost.mutate(body, { onSuccess: () => setDraft('') });
  }

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="max-h-[520px] overflow-y-auto p-4">
        {isLoading && <div className="py-6 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="py-6 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {posts && posts.length === 0 && (
          <div className="py-6 text-center text-sm text-ink-500">No messages yet — say hello to the class.</div>
        )}
        {posts && posts.length > 0 && (
          <div className="divide-y divide-surface-muted">
            {posts.map((post) => (
              <ChatPost
                key={post.id}
                post={post}
                expanded={!!expanded[post.id]}
                onToggleReplies={() => setExpanded((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                replying={replyingTo === post.id}
                onReplyClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                onReplied={() => {
                  setReplyingTo(null);
                  setExpanded((prev) => ({ ...prev, [post.id]: true }));
                }}
                cohortId={cohortId}
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message this class…"
          className="input flex-1 !rounded-full"
        />
        <button
          type="submit"
          disabled={!draft.trim() || createPost.isPending}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-50"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
      {createPost.error && <div className="px-3 pb-3 text-[11px] font-semibold text-danger">{createPost.error.message}</div>}
    </div>
  );
}

function ChatPost({ post, expanded, onToggleReplies, replying, onReplyClick, onReplied, cohortId }) {
  const { user } = useAuth();
  const isOwn = user?.username === post.author_username;
  const createReply = useCreateClassReply(cohortId);
  const [replyDraft, setReplyDraft] = useState('');

  function handleReply(e) {
    e.preventDefault();
    const body = replyDraft.trim();
    if (!body) return;
    createReply.mutate({ postId: post.id, body }, { onSuccess: () => { setReplyDraft(''); onReplied(); } });
  }

  return (
    <div className={`flex gap-2.5 py-3 first:pt-0 last:pb-0 ${isOwn ? '-mx-2 rounded bg-surface-muted/60 px-2' : ''}`}>
      <Avatar name={post.author_username} size={30} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-900">{post.author_username}</span>
          {STAFF_ROLES.includes(post.author_role) && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-dark">Teacher</span>
          )}
          <span className="text-[10.5px] text-ink-500">{formatWhen(post.created_at)}</span>
        </div>
        <div className="mt-0.5 whitespace-pre-wrap text-[12.5px] text-ink-700">{post.body}</div>

        <div className="mt-1.5 flex items-center gap-3">
          <button onClick={onReplyClick} className="text-[11px] font-semibold text-ink-500 hover:text-accent-dark">
            Reply
          </button>
          {post.replies.length > 0 && (
            <button onClick={onToggleReplies} className="text-[11px] font-semibold text-ink-500 hover:text-accent-dark">
              {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'} {expanded ? '▴' : '▾'}
            </button>
          )}
        </div>

        {expanded && post.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-surface-muted pl-3">
            {post.replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-1.5">
                <Avatar name={reply.author_username} size={20} />
                <div className="min-w-0 text-[11.5px]">
                  <span className="font-semibold text-ink-900">{reply.author_username}</span>{' '}
                  <span className="text-ink-700">{reply.body}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {replying && (
          <form onSubmit={handleReply} className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={`Reply to ${post.author_username}…`}
              className="input flex-1 !py-1.5 !text-[12px]"
              autoFocus
            />
            <button
              type="submit"
              disabled={!replyDraft.trim() || createReply.isPending}
              className="rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-accent-ink disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

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
