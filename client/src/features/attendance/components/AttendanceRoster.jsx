import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useAttendanceForCohortDate, useMarkAttendance } from '../hooks/useAttendance';
import { Avatar } from '../../../components/Avatar';
import { Pagination } from '../../../components/Pagination';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const STATUS_CONFIG = {
  present: { label: 'Present', dot: '#22C55E', bg: '#EAFBF2', text: '#15803D' },
  absent:  { label: 'Absent',  dot: '#EF4444', bg: '#FEE2E2', text: '#DC2626' },
  late:    { label: 'Late',    dot: '#F59E0B', bg: '#FFF4E7', text: '#B45309' },
  excused: { label: 'Excused', dot: '#6B7280', bg: '#F1F1F6', text: '#45454F' },
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDateDisplay(isoDate) {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

function formatTimeDisplay(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Actions Menu ─────────────────────────────────────────────────────
function ActionsMenu({ onEditRemarks }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted hover:text-ink-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-border bg-surface p-1 shadow-md">
          <button
            onClick={() => { onEditRemarks(); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-surface-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Edit Remarks
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────
function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="border-b border-border/50 px-5 py-4"><div className="h-4 w-6 rounded bg-surface-muted" /></td>
      <td className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-muted" />
          <div className="space-y-1.5"><div className="h-4 w-28 rounded bg-surface-muted" /><div className="h-3 w-20 rounded bg-surface-muted" /></div>
        </div>
      </td>
      <td className="border-b border-border/50 px-5 py-4"><div className="h-4 w-14 rounded bg-surface-muted" /></td>
      <td className="border-b border-border/50 px-5 py-4"><div className="h-6 w-20 rounded-full bg-surface-muted" /></td>
      <td className="border-b border-border/50 px-5 py-4"><div className="h-4 w-16 rounded bg-surface-muted" /></td>
      <td className="border-b border-border/50 px-5 py-4"><div className="h-4 w-12 rounded bg-surface-muted" /></td>
      <td className="border-b border-border/50 px-5 py-4"><div className="h-4 w-6 rounded bg-surface-muted" /></td>
    </tr>
  ));
}


// ─── Main Component ───────────────────────────────────────────────────
export function AttendanceRoster({ lockedCohortId } = {}) {
  const { t } = useConfig();
  const { can } = useAuth();
  const canMark = can('attendance.mark');
  const canViewCohorts = can('cohorts.view') || can('cohorts.manage');
  const { data: cohorts } = useCohorts({ enabled: !lockedCohortId && canViewCohorts });
  const { data: allLearners } = useLearners();
  const markAttendance = useMarkAttendance();

  const [cohortId, setCohortId] = useState(lockedCohortId || '');
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [remarks, setRemarks] = useState({});
  const [editingRemarksFor, setEditingRemarksFor] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: existingRecords, isLoading: loadingRoster } = useAttendanceForCohortDate(cohortId, date);

  const roster = useMemo(
    () => (allLearners || []).filter((learner) => String(learner.cohort_id) === String(cohortId)),
    [allLearners, cohortId]
  );

  // Re-derive local status selections whenever the cohort/date/roster/existing
  // records change, defaulting anyone not yet marked to "present".
  useEffect(() => {
    if (!cohortId || !date) return;
    const nextStatuses = {};
    const nextRemarks = {};
    for (const learner of roster) {
      const existing = (existingRecords || []).find((r) => r.learner_id === learner.id);
      nextStatuses[learner.id] = existing?.status || 'present';
      nextRemarks[learner.id] = existing?.remarks || '';
    }
    setStatuses(nextStatuses);
    setRemarks(nextRemarks);
    setSavedAt(null);
  }, [cohortId, date, roster, existingRecords]);

  // Reset page on search/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filtered + searched roster
  const filteredRoster = useMemo(() => {
    let result = roster;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((l) => (statuses[l.id] || 'present') === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
        const regNo = (l.registry_no || '').toLowerCase();
        return fullName.includes(q) || regNo.includes(q);
      });
    }

    return result;
  }, [roster, statuses, statusFilter, searchQuery]);

  // Pagination
  const totalItems = filteredRoster.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRoster = filteredRoster.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Build a lookup for existing records by learner_id for timestamps
  const recordByLearnerId = useMemo(() => {
    const map = {};
    for (const r of existingRecords || []) {
      map[r.learner_id] = r;
    }
    return map;
  }, [existingRecords]);

  // Get cohort name for display
  const selectedCohort = useMemo(
    () => (cohorts || []).find((c) => String(c.id) === String(cohortId)),
    [cohorts, cohortId]
  );

  async function handleSaveAll() {
    setSaveError(null);
    try {
      await Promise.all(
        roster.map((learner) =>
          markAttendance.mutateAsync({
            learner_id: learner.id,
            cohort_id: Number(cohortId),
            date,
            status: statuses[learner.id] || 'present',
            remarks: remarks[learner.id] || null
          })
        )
      );
      setSavedAt(new Date());
      setEditingRemarksFor(null);
    } catch (err) {
      setSaveError(err.message || 'Failed to save attendance');
    }
  }

  function handleExport() {
    const headers = ['#', 'Student Name', 'Roll No.', 'Status', 'Checked In', 'Remarks'];
    const rows = filteredRoster.map((learner, i) => {
      const rec = recordByLearnerId[learner.id];
      return [
        i + 1,
        `${learner.first_name} ${learner.last_name}`,
        learner.registry_no || '',
        (statuses[learner.id] || 'present').charAt(0).toUpperCase() + (statuses[learner.id] || 'present').slice(1),
        formatTimeDisplay(rec?.updated_at || rec?.created_at),
        remarks[learner.id] || ''
      ];
    });
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Class picker (only on full page, not class channel tab) */}
        {!lockedCohortId && (
          <div className="relative">
            <select
              className="appearance-none rounded-xl border border-border bg-surface pl-9 pr-8 py-2.5 text-[14px] font-medium text-ink-900 hover:bg-surface-muted transition-colors cursor-pointer"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
            >
              <option value="">Select {t('cohort').toLowerCase()}…</option>
              {canViewCohorts ? (
                (cohorts || []).map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                ))
              ) : (
                <option disabled>No accessible cohorts</option>
              )}
            </select>
            {/* Calendar icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        )}

        {/* Date picker */}
        <label className="relative">
          <input
            type="date"
            className="appearance-none rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-[14px] font-medium text-ink-900 hover:bg-surface-muted transition-colors cursor-pointer"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </label>

        {/* Status filter */}
        <select
          className="appearance-none rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-medium text-ink-900 hover:bg-surface-muted transition-colors cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student..."
            className="rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-[14px] text-ink-900 placeholder:text-ink-300 w-[220px] hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={!cohortId || roster.length === 0}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-medium text-ink-700 hover:bg-surface-muted disabled:opacity-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* ── Save bar ────────────────────────────────────────────────── */}
      {canMark && cohortId && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            disabled={!cohortId || roster.length === 0 || markAttendance.isPending}
            className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {markAttendance.isPending ? 'Saving…' : 'Save All'}
          </button>
          {savedAt && (
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Saved successfully
            </span>
          )}
          {saveError && (
            <span className="text-[13px] font-semibold text-danger">{saveError}</span>
          )}
        </div>
      )}

      {/* ── Empty / select state ────────────────────────────────────── */}
      {!cohortId && (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-ink-900">Select a {t('cohort').toLowerCase()}</h3>
          <p className="mt-1 text-[14px] text-ink-500">Choose a class and date to view or mark attendance.</p>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────────── */}
      {cohortId && loadingRoster && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">#</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Student</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Roll No.</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Status</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Checked In</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Remarks</th>
                <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRows count={5} />
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty roster ────────────────────────────────────────────── */}
      {cohortId && !loadingRoster && roster.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: '#FFEAF3' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C0396E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-ink-900">No students found</h3>
          <p className="mt-1 text-[14px] text-ink-500">No {t('learners').toLowerCase()} are assigned to this {t('cohort').toLowerCase()} yet.</p>
        </div>
      )}

      {/* ── No search results ───────────────────────────────────────── */}
      {cohortId && !loadingRoster && roster.length > 0 && filteredRoster.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: '#EAF2FF' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B6FC0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-ink-900">No matching students</h3>
          <p className="mt-1 text-[14px] text-ink-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* ── Data Table ──────────────────────────────────────────────── */}
      {cohortId && !loadingRoster && filteredRoster.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500 w-12">#</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Student</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Roll No.</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Checked In</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-ink-500">Remarks</th>
                  <th className="border-b border-border bg-surface-muted px-5 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-ink-500 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRoster.map((learner, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const learnerName = `${learner.first_name} ${learner.last_name}`;
                  const rec = recordByLearnerId[learner.id];
                  const cohortName = selectedCohort?.name || lockedCohortId ? '' : '';
                  const subtitle = [cohortName, learner.registry_no].filter(Boolean).join(' · ');

                  return (
                    <tr key={learner.id} className="group hover:bg-surface-muted/40 transition-colors">
                      {/* # */}
                      <td className="border-b border-border/50 px-5 py-3.5 text-[14px] font-medium text-ink-500">
                        {globalIdx}
                      </td>

                      {/* Student */}
                      <td className="border-b border-border/50 px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={learnerName} src={learner.photo_url} size={40} />
                          <div>
                            <div className="text-[14px] font-semibold text-ink-900">{learnerName}</div>
                            {subtitle && <div className="text-[12px] text-ink-500">{subtitle}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Roll No. */}
                      <td className="border-b border-border/50 px-5 py-3.5 text-[14px] text-ink-700 font-medium">
                        {learner.registry_no || '—'}
                      </td>

                      {/* Status */}
                      <td className="border-b border-border/50 px-5 py-3.5">
                        {canMark ? (
                          <select
                            className="appearance-none rounded-full px-3 py-1.5 text-[12px] font-semibold border-0 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
                            style={{
                              backgroundColor: STATUS_CONFIG[statuses[learner.id] || 'present'].bg,
                              color: STATUS_CONFIG[statuses[learner.id] || 'present'].text,
                            }}
                            value={statuses[learner.id] || 'present'}
                            onChange={(e) =>
                              setStatuses((prev) => ({ ...prev, [learner.id]: e.target.value }))
                            }
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={statuses[learner.id] || 'present'} />
                        )}
                      </td>

                      {/* Checked In */}
                      <td className="border-b border-border/50 px-5 py-3.5 text-[14px] text-ink-500">
                        {formatTimeDisplay(rec?.updated_at || rec?.created_at)}
                      </td>

                      {/* Remarks */}
                      <td className="border-b border-border/50 px-5 py-3.5">
                        {editingRemarksFor === learner.id ? (
                          <input
                            autoFocus
                            type="text"
                            className="rounded-lg border border-accent/30 bg-surface px-3 py-1.5 text-[13px] w-full focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                            value={remarks[learner.id] || ''}
                            onChange={(e) =>
                              setRemarks((prev) => ({ ...prev, [learner.id]: e.target.value }))
                            }
                            onBlur={() => setEditingRemarksFor(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') setEditingRemarksFor(null);
                            }}
                            placeholder="Add remarks..."
                          />
                        ) : (
                          <span className="text-[14px] text-ink-500">
                            {remarks[learner.id] || '—'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="border-b border-border/50 px-5 py-3.5 text-center">
                        {canMark && (
                          <ActionsMenu onEditRemarks={() => setEditingRemarksFor(learner.id)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {paginatedRoster.map((learner, idx) => {
              const globalIdx = (currentPage - 1) * pageSize + idx + 1;
              const learnerName = `${learner.first_name} ${learner.last_name}`;
              const rec = recordByLearnerId[learner.id];

              return (
                <div key={learner.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-ink-300 w-6">{globalIdx}</span>
                      <Avatar name={learnerName} src={learner.photo_url} size={36} />
                      <div>
                        <div className="text-[14px] font-semibold text-ink-900">{learnerName}</div>
                        <div className="text-[12px] text-ink-500">{learner.registry_no || '—'}</div>
                      </div>
                    </div>
                    <StatusBadge status={statuses[learner.id] || 'present'} />
                  </div>

                  {canMark && (
                    <div className="flex items-center gap-2 pl-9">
                      <select
                        className="appearance-none rounded-full px-3 py-1.5 text-[12px] font-semibold border-0 cursor-pointer transition-colors"
                        style={{
                          backgroundColor: STATUS_CONFIG[statuses[learner.id] || 'present'].bg,
                          color: STATUS_CONFIG[statuses[learner.id] || 'present'].text,
                        }}
                        value={statuses[learner.id] || 'present'}
                        onChange={(e) =>
                          setStatuses((prev) => ({ ...prev, [learner.id]: e.target.value }))
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingRemarksFor(editingRemarksFor === learner.id ? null : learner.id)}
                        className="text-[12px] font-medium text-accent hover:underline"
                      >
                        {remarks[learner.id] ? 'Edit Remarks' : 'Add Remarks'}
                      </button>
                    </div>
                  )}

                  {editingRemarksFor === learner.id && (
                    <div className="pl-9">
                      <input
                        autoFocus
                        type="text"
                        className="rounded-lg border border-accent/30 bg-surface px-3 py-1.5 text-[13px] w-full focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        value={remarks[learner.id] || ''}
                        onChange={(e) =>
                          setRemarks((prev) => ({ ...prev, [learner.id]: e.target.value }))
                        }
                        onBlur={() => setEditingRemarksFor(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setEditingRemarksFor(null);
                        }}
                        placeholder="Add remarks..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="border-t border-border bg-surface px-5 py-3.5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              showInfo={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
