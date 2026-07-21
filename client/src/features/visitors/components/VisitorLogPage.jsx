import { useState } from 'react';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { PageHeader } from '../../../components/PageHeader';
import { useVisitors, useCheckOutVisitor } from '../hooks/useVisitors';
import { CheckInModal } from './CheckInModal';

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function VisitorLogPage() {
  const [date, setDate] = useState(todayIso());
  const [searchInput, setSearchInput] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);

  const filters = { date: date || undefined, search: searchInput || undefined };
  const { data: visitors, isLoading, error } = useVisitors({ filters });
  const checkOut = useCheckOutVisitor();

  const currentlyIn = (visitors || []).filter((v) => !v.check_out_time).length;

  const columns = [
    { key: 'visitor', header: 'Visitor', render: (row) => (
      <div>
        <div className="font-semibold">{row.visitor_name}</div>
        {row.visitor_phone && <div className="text-[11.5px] text-ink-500">{row.visitor_phone}</div>}
      </div>
    ) },
    { key: 'purpose', header: 'Purpose', render: (row) => row.purpose },
    { key: 'host', header: 'Meeting', render: (row) => row.host_name },
    { key: 'check_in', header: 'Check In', render: (row) => formatTime(row.check_in_time) },
    { key: 'check_out', header: 'Check Out', render: (row) => formatTime(row.check_out_time) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (row.check_out_time ? <Badge variant="inactive">Checked Out</Badge> : <Badge variant="active">On Campus</Badge>)
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        !row.check_out_time && (
          <div className="flex justify-end">
            <button
              onClick={() => checkOut.mutate(row.id)}
              disabled={checkOut.isPending}
              className="text-xs font-semibold text-accent-dark hover:underline disabled:opacity-60"
            >
              Check Out
            </button>
          </div>
        )
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Front Desk"
        title="Visitor Log"
        actions={
          <button
            onClick={() => setShowCheckIn(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Check In Visitor
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Visitors (selected date)" value={isLoading ? '—' : (visitors || []).length} />
        <StatCard label="Currently On Campus" value={isLoading ? '—' : currentlyIn} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="w-[180px]">
          <div className="mb-1 text-xs font-semibold text-ink-700">Date</div>
          <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="min-w-[200px] flex-1">
          <div className="mb-1 text-xs font-semibold text-ink-700">Search</div>
          <input
            className="input"
            placeholder="Search by visitor or host name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        {date && (
          <button
            type="button"
            onClick={() => setDate('')}
            className="rounded border border-border px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
          >
            All dates
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {visitors && (
          <DataTable columns={columns} rows={visitors} rowKey={(row) => row.id} emptyMessage="No visitors logged for this date." />
        )}
      </div>

      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
    </div>
  );
}
