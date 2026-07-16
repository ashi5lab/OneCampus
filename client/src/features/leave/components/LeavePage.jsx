import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { StatCard } from '../../../components/StatCard';
import { useMyLeave, useLeaveQueue, useCancelLeave } from '../hooks/useLeave';
import { LEAVE_TYPE_LABEL, LEAVE_STATUS_LABEL } from '../types';
import { LeaveApplyModal } from './LeaveApplyModal';
import { ReviewLeaveModal } from './ReviewLeaveModal';

const STATUS_CLASS = {
  pending: 'bg-surface-muted text-ink-700',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
  cancelled: 'bg-surface-muted text-ink-500'
};

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[status] || STATUS_CLASS.pending}`}>
      {LEAVE_STATUS_LABEL[status] || status}
    </span>
  );
}

function daysLabel(row) {
  const suffix = row.is_half_day ? ` (${row.half_day_period === 'first_half' ? 'first half' : 'second half'})` : '';
  return `${row.num_days} day${Number(row.num_days) === 1 ? '' : 's'}${suffix}`;
}

export function LeavePage() {
  const { can } = useAuth();
  const canApprove = can('leave.approve');
  const [tab, setTab] = useState('mine');
  const [showApply, setShowApply] = useState(false);
  const [reviewing, setReviewing] = useState(null);

  const { data: mine, isLoading: mineLoading, error: mineError } = useMyLeave();
  const { data: queue, isLoading: queueLoading, error: queueError } = useLeaveQueue({ enabled: canApprove && tab === 'approvals' });
  const cancelLeave = useCancelLeave();

  const mineColumns = [
    { key: 'type', header: 'Type', render: (row) => LEAVE_TYPE_LABEL[row.leave_type] || row.leave_type },
    { key: 'dates', header: 'Dates', render: (row) => `${row.start_date} → ${row.end_date}` },
    { key: 'days', header: 'Duration', render: (row) => daysLabel(row) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'note', header: 'Reviewer Note', render: (row) => row.review_note || '—' },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'pending' ? (
          <button
            onClick={() => cancelLeave.mutate(row.id)}
            className="text-xs font-semibold text-danger hover:opacity-80"
          >
            Withdraw
          </button>
        ) : null
    }
  ];

  const queueColumns = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.applicant_first_name} {row.applicant_last_name}</div>
          <div className="text-[11.5px] capitalize text-ink-500">{row.applicant_role}{row.applicant_cohort_name ? ` · ${row.applicant_cohort_name}` : ''}</div>
        </div>
      )
    },
    { key: 'type', header: 'Type', render: (row) => LEAVE_TYPE_LABEL[row.leave_type] || row.leave_type },
    { key: 'dates', header: 'Dates', render: (row) => `${row.start_date} → ${row.end_date}` },
    { key: 'days', header: 'Duration', render: (row) => daysLabel(row) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'pending' ? (
          <button onClick={() => setReviewing(row)} className="text-xs font-semibold text-accent-dark hover:underline">
            Review
          </button>
        ) : (
          <span className="text-[11.5px] text-ink-500">{row.reviewed_by_username ? `by ${row.reviewed_by_username}` : '—'}</span>
        )
    }
  ];

  const pendingMine = (mine || []).filter((r) => r.status === 'pending').length;
  const pendingQueue = (queue || []).filter((r) => r.status === 'pending').length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Leave</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Leave</h1>
        </div>
        <button
          onClick={() => setShowApply(true)}
          className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
        >
          + Apply for Leave
        </button>
      </div>

      {canApprove && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setTab('mine')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'mine' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'}`}
          >
            My Requests
          </button>
          <button
            onClick={() => setTab('approvals')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === 'approvals' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'}`}
          >
            Approvals
          </button>
        </div>
      )}

      {(tab === 'mine' || !canApprove) && (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard label="Total Requests" value={mineLoading ? '—' : mine.length} />
            <StatCard label="Pending" value={mineLoading ? '—' : pendingMine} />
          </div>
          <div className="overflow-hidden rounded border border-border bg-surface">
            {mineLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
            {mineError && <div className="p-8 text-center text-sm font-semibold text-danger">{mineError.message}</div>}
            {mine && <DataTable columns={mineColumns} rows={mine} rowKey={(row) => row.id} emptyMessage="No leave requests yet." />}
          </div>
        </>
      )}

      {canApprove && tab === 'approvals' && (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard label="In Queue" value={queueLoading ? '—' : queue.length} />
            <StatCard label="Awaiting Review" value={queueLoading ? '—' : pendingQueue} />
          </div>
          <div className="overflow-hidden rounded border border-border bg-surface">
            {queueLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
            {queueError && <div className="p-8 text-center text-sm font-semibold text-danger">{queueError.message}</div>}
            {queue && (
              <DataTable columns={queueColumns} rows={queue} rowKey={(row) => row.id} emptyMessage="Nothing awaiting your review." />
            )}
          </div>
        </>
      )}

      {showApply && <LeaveApplyModal onClose={() => setShowApply(false)} />}
      {reviewing && <ReviewLeaveModal leave={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}
