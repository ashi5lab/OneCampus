import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useClassPosts,
  useClassMembers,
  useCreateClassPost,
  useCreateClassReply,
  useEditPost,
  useEditReply,
  useDeletePost,
  useDeleteReply,
  useSetReaction,
  usePinPost,
  useUnpinPost
} from '../hooks/useClassChannel';
import { markupToHtml } from '../../../lib/richTextMarkup';
import { MessageComposer } from './MessageComposer';
import { MessagePost } from './MessagePost';
import { EditHistoryModal } from './EditHistoryModal';

export function ClassChatTab({ cohortId }) {
  const { user } = useAuth();
  const { data: result, isLoading, error } = useClassPosts(cohortId);
  const { data: members } = useClassMembers(cohortId);
  const createPost = useCreateClassPost(cohortId);
  const createReply = useCreateClassReply(cohortId);
  const editPost = useEditPost(cohortId);
  const editReply = useEditReply(cohortId);
  const deletePost = useDeletePost(cohortId);
  const deleteReply = useDeleteReply(cohortId);
  const setReaction = useSetReaction(cohortId);
  const pinPost = usePinPost(cohortId);
  const unpinPost = useUnpinPost(cohortId);

  const [replyingTo, setReplyingTo] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null); // { kind, id }

  const posts = result?.data || [];
  const canModerate = result?.canModerate || false;
  const pinnedPost = posts.find((p) => p.pinned_at);

  async function handleNewPost({ text, file }) {
    await createPost.mutateAsync({ body: markupToHtml(text), file });
  }

  async function handleReply(postId, { text, file }) {
    await createReply.mutateAsync({ postId, body: markupToHtml(text), file });
    setReplyingTo(null);
  }

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      {pinnedPost && (
        <button
          onClick={() => document.getElementById(`class-post-${pinnedPost.id}`)?.scrollIntoView({ block: 'center' })}
          className="flex w-full items-center gap-2 border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 text-amber-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v5M9 3h6l-1 7 4 3H6l4-3-1-7z" />
          </svg>
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-amber-800">
            Pinned: {(pinnedPost.body || '').replace(/<[^>]+>/g, '') || 'Attachment'}
          </span>
        </button>
      )}

      <div className="max-h-[520px] overflow-y-auto p-3">
        {isLoading && <div className="py-6 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="py-6 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {posts.length === 0 && !isLoading && (
          <div className="py-6 text-center text-sm text-ink-500">No messages yet — say hello to the class.</div>
        )}

        <div className="divide-y divide-surface-muted">
          {posts.map((post) => (
            <div key={post.id} id={`class-post-${post.id}`}>
              <MessagePost
                message={post}
                kind="post"
                currentUserId={user?.id}
                canModerate={canModerate}
                members={members || []}
                isPinned={!!post.pinned_at}
                onReply={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                onEdit={(text) => editPost.mutateAsync({ id: post.id, body: markupToHtml(text) })}
                onDelete={() => deletePost.mutate(post.id)}
                onReact={(emoji) => setReaction.mutate({ postId: post.id, emoji })}
                onPin={() => pinPost.mutate(post.id)}
                onUnpin={() => unpinPost.mutate()}
                onViewHistory={() => setHistoryTarget({ kind: 'post', id: post.id })}
              />

              {post.replies.length > 0 && (
                <div className="ml-9 space-y-0.5 border-l-2 border-surface-muted pl-3">
                  {post.replies.map((reply) => (
                    <MessagePost
                      key={reply.id}
                      message={reply}
                      kind="reply"
                      currentUserId={user?.id}
                      canModerate={canModerate}
                      members={members || []}
                      onEdit={(text) => editReply.mutateAsync({ id: reply.id, body: markupToHtml(text) })}
                      onDelete={() => deleteReply.mutate(reply.id)}
                      onViewHistory={() => setHistoryTarget({ kind: 'reply', id: reply.id })}
                    />
                  ))}
                </div>
              )}

              {replyingTo === post.id && (
                <div className="ml-9 border-l-2 border-surface-muted py-2 pl-3">
                  <MessageComposer
                    members={members || []}
                    placeholder={`Reply…`}
                    submitLabel="Send"
                    autoFocus
                    onCancel={() => setReplyingTo(null)}
                    onSubmit={(payload) => handleReply(post.id, payload)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <MessageComposer members={members || []} onSubmit={handleNewPost} />

      {historyTarget && (
        <EditHistoryModal kind={historyTarget.kind} id={historyTarget.id} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
