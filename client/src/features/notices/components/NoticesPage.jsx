import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge } from '../../../components/Badge';
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice } from '../hooks/useNotices';
import { NoticeFormModal } from './NoticeFormModal';

const AUDIENCE_LABEL = { all: 'Everyone', instructors: 'Instructors', learners: 'Learners', guardians: 'Guardians' };

export function NoticesPage() {
  const { can } = useAuth();
  const { data: notices, isLoading, error } = useNotices();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Notices</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Notice Board</h1>
        </div>
        {can('notices.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Post Notice
          </button>
        )}
      </div>

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {notices && notices.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          No notices posted yet.
        </div>
      )}

      <div className="space-y-3">
        {(notices || []).map((notice) => (
          <div key={notice.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[15px] font-semibold text-ink-900">{notice.title}</div>
                  <Badge variant={notice.audience === 'all' ? 'active' : 'pending'}>
                    {AUDIENCE_LABEL[notice.audience] || notice.audience}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[12px] text-ink-500">
                  {notice.posted_by_username && `${notice.posted_by_username} · `}
                  {new Date(notice.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mt-2 whitespace-pre-wrap text-[13.5px] text-ink-700">{notice.body}</div>

            {can('notices.manage') && (
              <div className="mt-3 flex gap-4 border-t border-border pt-3">
                <button
                  onClick={() => setEditingNotice(notice)}
                  className="text-xs font-semibold text-ink-500 hover:text-ink-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${notice.title}"?`)) deleteNotice.mutate(notice.id);
                  }}
                  className="text-xs font-semibold text-danger hover:opacity-80"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <NoticeFormModal
          onClose={() => setShowForm(false)}
          submitting={createNotice.isPending}
          submitError={createNotice.error?.message}
          onSubmit={(values) => createNotice.mutate(values, { onSuccess: () => setShowForm(false) })}
        />
      )}

      {editingNotice && (
        <NoticeFormModal
          initialData={editingNotice}
          onClose={() => setEditingNotice(null)}
          submitting={updateNotice.isPending}
          submitError={updateNotice.error?.message}
          onSubmit={(values) =>
            updateNotice.mutate({ id: editingNotice.id, payload: values }, { onSuccess: () => setEditingNotice(null) })
          }
        />
      )}
    </div>
  );
}
