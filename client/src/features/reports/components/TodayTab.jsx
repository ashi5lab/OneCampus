import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertCircle, Clock, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTodayReport } from '../hooks/useReports';
import { Badge } from '../../../components/Badge';

const PREVIEW_LIMIT = 10;

function fmt(time) {
  if (!time) return '—';
  return String(time).slice(0, 5);
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-ink-900 leading-none">{value}</div>
        <div className="mt-0.5 text-[12px] font-medium text-ink-500">{label}</div>
        {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, count, badge, children, defaultOpen = false, viewAllTo }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-ink-900">{title}</span>
          {badge}
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-500">{count}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
      </button>
      {open && (
        <div className="border-t border-border">
          {children}
          {viewAllTo && count > PREVIEW_LIMIT && (
            <Link
              to={viewAllTo}
              onClick={(e) => e.stopPropagation()}
              className="block border-t border-border px-4 py-3 text-center text-[12.5px] font-semibold text-accent hover:bg-surface-muted"
            >
              View all {count} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
      <p className="text-[13px] font-medium text-ink-500">{message}</p>
    </div>
  );
}

export function TodayTab() {
  const { data, isLoading, error } = useTodayReport();
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading today's snapshot…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const { summary, late = [], absent = [], discipline = [] } = data || {};
  const s = summary || {};

  return (
    <div className="space-y-4">
      {/* Date chip */}
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-surface-muted px-3 py-1 text-[11.5px] font-medium text-ink-500">{today}</div>
        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-[11px] text-ink-400">Live · refreshes every minute</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={CheckCircle2}
          label="Present Today"
          value={s.present ?? '—'}
          color="bg-success/10 text-success"
        />
        <SummaryCard
          icon={Clock}
          label="Late Today"
          value={s.late ?? '—'}
          color="bg-accent/10 text-accent"
        />
        <SummaryCard
          icon={AlertCircle}
          label="Absent Today"
          value={s.absent ?? '—'}
          color="bg-danger/10 text-danger"
        />
        <SummaryCard
          icon={ShieldAlert}
          label="Discipline"
          value={s.discipline_total ?? '—'}
          sub={s.discipline_major > 0 ? `${s.discipline_major} major` : undefined}
          color="bg-warning/10 text-warning"
        />
      </div>

      {/* Late section */}
      <Section
        title="Late Today"
        count={late.length}
        defaultOpen={true}
        badge={late.length > 0 ? <Badge variant="warning">Late</Badge> : null}
        viewAllTo="/app/reports/today/late"
      >
        {late.length === 0 ? (
          <EmptyState message="No late arrivals today" />
        ) : (
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="hidden grid-cols-12 gap-2 px-4 py-2 sm:grid">
              <span className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Student</span>
              <span className="col-span-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Class</span>
              <span className="col-span-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Marked By</span>
              <span className="col-span-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-400">Time</span>
            </div>
            {late.slice(0, PREVIEW_LIMIT).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-4 py-3 sm:grid-cols-12">
                <div className="col-span-1 sm:col-span-4">
                  <div className="text-[13px] font-semibold text-ink-900">{row.student_name}</div>
                  {row.late_minutes > 0 && (
                    <div className="text-[11px] text-accent">Late by {Math.round(row.late_minutes)} min</div>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <div className="text-[13px] text-ink-700">{row.cohort_name}</div>
                  <div className="text-[11px] text-ink-400 sm:hidden">By {row.marked_by}</div>
                </div>
                <div className="col-span-1 hidden text-[13px] text-ink-600 sm:col-span-3 sm:block">{row.marked_by}</div>
                <div className="col-span-1 text-right text-[12px] font-mono text-ink-500 sm:col-span-2">{fmt(row.time)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Absent section */}
      <Section
        title="Absent Today"
        count={absent.length}
        badge={absent.length > 0 ? <Badge variant="danger">Absent</Badge> : null}
        defaultOpen={absent.length > 0 && late.length === 0}
        viewAllTo="/app/reports/today/absent"
      >
        {absent.length === 0 ? (
          <EmptyState message="No absences recorded today" />
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-12 gap-2 px-4 py-2 sm:grid">
              <span className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Student</span>
              <span className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Class</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Marked By</span>
              <span className="col-span-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-400">Time</span>
            </div>
            {absent.slice(0, PREVIEW_LIMIT).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-2 px-4 py-3 sm:grid-cols-12">
                <div className="col-span-1 sm:col-span-4 text-[13px] font-semibold text-ink-900">{row.student_name}</div>
                <div className="col-span-1 sm:col-span-4 text-[13px] text-ink-700">{row.cohort_name}</div>
                <div className="col-span-1 hidden sm:col-span-2 sm:block text-[13px] text-ink-600">{row.marked_by}</div>
                <div className="col-span-1 text-right text-[12px] font-mono text-ink-500 sm:col-span-2">{fmt(row.time)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Discipline section */}
      <Section
        title="Discipline Today"
        count={discipline.length}
        badge={
          discipline.some((d) => d.severity === 'major')
            ? <Badge variant="danger">Major</Badge>
            : discipline.length > 0
              ? <Badge variant="warning">Minor</Badge>
              : null
        }
        defaultOpen={discipline.length > 0 && late.length === 0 && absent.length === 0}
        viewAllTo="/app/reports/today/discipline"
      >
        {discipline.length === 0 ? (
          <EmptyState message="No discipline incidents today" />
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-12 gap-2 px-4 py-2 sm:grid">
              <span className="col-span-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Student</span>
              <span className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Class</span>
              <span className="col-span-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Type</span>
              <span className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Details</span>
              <span className="col-span-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-400">Time</span>
            </div>
            {discipline.slice(0, PREVIEW_LIMIT).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-2 gap-y-1 px-4 py-3 sm:grid-cols-12 sm:gap-y-0 sm:items-center">
                <div className="col-span-1 sm:col-span-3 text-[13px] font-semibold text-ink-900">{row.student_name}</div>
                <div className="col-span-1 sm:col-span-2 text-[13px] text-ink-700">{row.cohort_name}</div>
                <div className="col-span-1 sm:col-span-1">
                  <Badge variant={row.severity === 'major' ? 'danger' : row.severity === 'minor' ? 'warning' : 'active'}>
                    {row.severity}
                  </Badge>
                </div>
                <div className="col-span-2 sm:col-span-4 text-[12px] text-ink-600 truncate">{row.description || '—'}</div>
                <div className="col-span-2 text-right text-[12px] font-mono text-ink-500 sm:col-span-2">{fmt(row.time)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
