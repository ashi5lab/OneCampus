import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { useMarkActivityContextViewed } from '../../activities/hooks/useActivities';
import { MessageComposer } from './MessageComposer';
import { MessagePost } from './MessagePost';
import { EditHistoryModal } from './EditHistoryModal';

export function ClassChatTab({ cohortId }) {
  const { user } = useAuth();
  const location = useLocation();
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
  
  useMarkActivityContextViewed(`chat_${cohortId}`);

  const [replyingTo, setReplyingTo] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null); // { kind, id }
  const scrollRef = useRef(null);
  // The cohort we've already done the initial bottom-scroll for. Can't tell
  // "first load" apart from "later update" just by watching cohortId change
  // (it doesn't change on a plain page load), so this is tracked directly —
  // null until a cohort's posts have loaded once.
  const initializedFor = useRef(null);

  const posts = result?.data || [];
  const canModerate = result?.canModerate || false;
  const pinnedPost = posts.find((p) => p.pinned_at);

  // Order never changes (oldest first, same as the API) — this just moves
  // the *view* to the latest message by default, WhatsApp/Teams-style, so
  // you land on the newest message instead of the oldest. If you've
  // scrolled up to read history, a message from someone else won't yank you
  // back down; the first load of a class (or switching to a different one)
  // always does.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoading) return;
    
    // Use a slightly longer timeout so complex DOM elements (like attachments)
    // finish their initial layout. A larger tolerance (300px) ensures we stay
    // snapped to the bottom even if a large post is added.
    setTimeout(() => {
      if (!el) return;
      const isFirstLoad = initializedFor.current !== cohortId;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 350;
      const targetPostId = location.state?.postId;
      
      if (isFirstLoad && targetPostId) {
        const targetEl = document.getElementById(`class-post-${targetPostId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ block: 'center', behavior: 'auto' });
          // Highlight it briefly
          targetEl.classList.add('bg-accent/10', 'transition-colors', 'duration-500');
          setTimeout(() => targetEl.classList.remove('bg-accent/10'), 2000);
        } else {
          el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
        }
      } else if (isFirstLoad || nearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: isFirstLoad ? 'auto' : 'smooth' });
      }
      initializedFor.current = cohortId;
    }, 150);
  }, [cohortId, posts.length, isLoading, location.state?.postId]);

  async function handleNewPost({ html, file }) {
    await createPost.mutateAsync({ body: html, file });
  }

  async function handleReply(postId, { html, file }) {
    await createReply.mutateAsync({ postId, body: html, file });
    setReplyingTo(null);
  }

  const sharedFiles = [
    { id: 1, name: 'Weekly Test Syllabus.pdf', type: 'PDF', size: '1.2 MB', uploadedAt: '18 Jul 2026' },
    { id: 2, name: 'Assignment Guidelines.docx', type: 'DOCX', size: '215 KB', uploadedAt: '15 Jul 2026' },
    { id: 3, name: 'Important Topics.pptx', type: 'PPTX', size: '3.4 MB', uploadedAt: '10 Jul 2026' },
  ];

  const getFileIcon = (type) => {
    const icons = { PDF: '📄', DOCX: '📝', PPTX: '📊', XLS: '📈', ZIP: '📦' };
    return icons[type] || '📎';
  };

  return (
    <div className="flex h-full flex-col overflow-hidden sm:rounded border-y sm:border border-border bg-surface -mx-4 sm:mx-0 lg:flex-row">
      {/* Main chat area */}
      <div className="flex h-full flex-col flex-1 overflow-hidden">
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

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
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
                  onEdit={(html) => editPost.mutateAsync({ id: post.id, body: html })}
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
                        onEdit={(html) => editReply.mutateAsync({ id: reply.id, body: html })}
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

        <div className="flex-shrink-0 border-t border-surface-muted px-2 py-2 sm:px-3">
          <MessageComposer members={members || []} onSubmit={handleNewPost} />
        </div>
      </div>

      {/* Sidebar: Class Info & Shared Files (desktop only) */}
      <div className="hidden lg:flex lg:w-80 lg:flex-col lg:border-l lg:border-surface-muted lg:bg-surface">
        {/* Class Info Section */}
        <div className="flex-shrink-0 border-b border-surface-muted p-4">
          <h3 className="font-semibold text-ink-900 mb-3">Class Info</h3>
          <div className="space-y-2 text-xs text-ink-500">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Academic Year 2026-2027</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span>14 Students</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🏫</span>
              <span>Room 101</span>
            </div>
          </div>
        </div>

        {/* Shared Files Section */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-surface-muted p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ink-900">Shared Files</h3>
              <a href="#" className="text-xs font-semibold text-accent hover:text-accent-dark">View all</a>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {sharedFiles.map((file) => (
              <div key={file.id} className="group flex items-start gap-2 rounded p-2 hover:bg-surface-muted transition-colors">
                <span className="flex-shrink-0 text-lg">{getFileIcon(file.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-ink-900 truncate group-hover:text-accent">{file.name}</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">{file.size} • {file.uploadedAt}</div>
                </div>
                <button className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {historyTarget && (
        <EditHistoryModal kind={historyTarget.kind} id={historyTarget.id} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  );
}
