import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useAttendanceForCohortDate, useMarkAttendance, useMarkAttendanceBulk } from '../hooks/useAttendance';
import { showToast } from '../../../lib/toast';
import { Avatar } from '../../../components/Avatar';
import { PageHeader } from '../../../components/PageHeader';
import { DatePicker } from '../../../components/DatePicker';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Search, Eye } from 'lucide-react';

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${month} ${day}, ${year}`;
}


const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: '#22c55e' },
  { value: 'absent', label: 'Absent', color: '#ef4444' },
  { value: 'late', label: 'Late', color: '#f59e0b' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// embedded=true: used inside ClassAttendanceTab (class channel tab) — the
// channel's own PageHeader owns the topbar, so skip overriding it here.
export function AttendanceRoster({ lockedCohortId, embedded = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLearnerId = searchParams.get('learner');
  const { can } = useAuth();
  const canMark = can('attendance.mark');
  const cohortId = lockedCohortId || '';

  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [openStatusId, setOpenStatusId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchRef = useRef(null);
  const dateInputRef = useRef(null);


  const { data: cohorts } = useCohorts();
  const { data: allLearners } = useLearners();
  const { data: existingRecords, isLoading: loadingRoster } = useAttendanceForCohortDate(cohortId, date);
  const markAttendanceBulk = useMarkAttendanceBulk();

  const selectedCohort = useMemo(
    () => (cohorts || []).find((c) => String(c.id) === String(cohortId)),
    [cohorts, cohortId]
  );

  const roster = useMemo(
    () => (allLearners || []).filter((l) => String(l.cohort_id) === String(cohortId)),
    [allLearners, cohortId]
  );

  useEffect(() => {
    if (initialLearnerId && roster.length > 0) {
      const learner = roster.find(l => String(l.id) === String(initialLearnerId));
      if (learner && !searchQuery) {
        setSearchQuery(`${learner.first_name} ${learner.last_name}`);
      }
    }
  }, [initialLearnerId, roster, searchQuery]);

  useEffect(() => {
    if (!cohortId || !date) return;
    const next = {};
    for (const learner of roster) {
      const existing = (existingRecords || []).find((r) => r.learner_id === learner.id);
      next[learner.id] = existing?.status || 'present';
    }
    setStatuses(next);
  }, [cohortId, date, roster, existingRecords]);

  // Close search/date dropdowns on outside click; status dropdowns use stopPropagation
  useEffect(() => {
    function handleMouseDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);

      setOpenStatusId(null);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase().trim();
    return roster.filter((l) => {
      const name = `${l.first_name} ${l.last_name}`.toLowerCase();
      const regNo = (l.registry_no || '').toLowerCase();
      return name.includes(q) || regNo.includes(q);
    });
  }, [roster, searchQuery]);

  const totalStudents = filteredRoster.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const paginatedRoster = filteredRoster.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [searchQuery, pageSize]);



  const visiblePages = useMemo(() => {
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + 2);
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [page, totalPages]);

  async function handleSaveAll() {
    try {
      const records = filteredRoster
        .map((learner) => ({
          learner_id: learner.id,
          status: statuses[learner.id] || 'present',
          remarks: null,
        }))
        .filter((r) => {
          const existing = (existingRecords || []).find((ex) => ex.learner_id === r.learner_id);
          const existingStatus = existing?.status || 'present';
          // Only send the payload if the status has actually changed from what is in the DB
          return r.status !== existingStatus;
        });

      await markAttendanceBulk.mutateAsync({
        cohort_id: Number(cohortId),
        date,
        records
      });
      showToast.success('Attendance saved successfully');
      navigate('/app/attendance');
    } catch (err) {
      showToast.error(err.message || 'Failed to save attendance');
    }
  }

  return (
    <div className="bg-[#f8f9fe] min-h-screen pb-32 font-body relative">
      {/* Set the topbar title only when used as a standalone page, not when
          embedded inside a class channel tab (which has its own PageHeader). */}
      {!embedded && (
        <PageHeader
          title="Class Attendance"
          subtitle={selectedCohort?.name}
          back={true}
          onBack={() => navigate('/app/attendance')}
        />
      )}

      {/* Main Content */}
      <div className="mt-4 pb-36">
        {/* Sticky Controls Header */}
        <div className="sticky top-0 z-40 bg-[#f8f9fe] pt-4 pb-3 px-4 space-y-3 border-b border-gray-100 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] -mx-4 sm:mx-0 sm:px-0 sm:border-0 sm:shadow-none sm:pb-0">
          {/* Search Students Autocomplete */}
          <div ref={searchRef} className="relative">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3 text-left"
            >
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className={`flex-1 text-[14px] ${searchQuery ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {searchQuery || 'Search students'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {searchOpen && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 mt-1 z-50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="flex-1 text-[14px] outline-none text-gray-900 placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredRoster.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] text-gray-500 text-center">No students found</div>
                  ) : (
                    filteredRoster.slice(0, 15).map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setSearchQuery(`${l.first_name} ${l.last_name}`); setSearchOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition border-b border-gray-50 last:border-0 text-left"
                      >
                        <Avatar name={`${l.first_name} ${l.last_name}`} src={l.photo_url} size={36} />
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-gray-900 truncate">{l.first_name} {l.last_name}</div>
                          <div className="text-[12px] text-gray-500">{l.registry_no || 'N/A'}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <DatePicker 
            value={date} 
            onChange={setDate} 
            max={todayIso()} 
          />

          {/* Table Header */}
          <div className="bg-[#f0f0fb] rounded-xl px-4 py-2.5 flex items-center text-[12px] font-semibold text-gray-500">
            <div className="w-8 text-center">#</div>
            <div className="flex-1 ml-3">Student</div>
            <div className="w-28 text-right">Attendance</div>
          </div>
        </div>

        {/* Student Rows */}
        <div className="px-4 mt-3 space-y-3">

        {/* Student Rows */}
        {loadingRoster ? (
          <div className="text-center py-10 text-gray-400 text-[14px]">Loading students...</div>
        ) : paginatedRoster.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[14px]">No students found.</div>
        ) : (
          <div className="bg-surface md:bg-white md:rounded-2xl md:shadow-sm border-0 md:border border-gray-100 divide-y divide-surface-muted -mx-4 md:mx-0">
            {paginatedRoster.map((learner, idx) => {
              const globalIdx = (page - 1) * pageSize + idx + 1;
              const currentStatus = statuses[learner.id] || 'present';
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];

              return (
                <div key={learner.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="text-[13px] text-gray-400 w-8 text-center flex-shrink-0">{globalIdx}</div>
                  <Avatar name={`${learner.first_name} ${learner.last_name}`} src={learner.photo_url} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-gray-900 truncate">
                      {learner.first_name} {learner.last_name}
                    </div>
                    <div className="text-[12px] text-gray-500">{learner.registry_no || 'N/A'}</div>
                  </div>

                  {canMark ? (
                    <div className="relative flex-shrink-0">
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setOpenStatusId(openStatusId === learner.id ? null : learner.id)}
                        className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-1.5 bg-white min-w-[105px] justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusOpt.color }} />
                          <span className="text-[13px] font-medium" style={{ color: statusOpt.color }}>
                            {statusOpt.label}
                          </span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {openStatusId === learner.id && (
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden min-w-[120px]"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setStatuses((prev) => ({ ...prev, [learner.id]: opt.value }));
                                setOpenStatusId(null);
                              }}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-gray-50 transition
                                ${currentStatus === opt.value ? 'font-bold bg-gray-50' : ''}`}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                              <span style={{ color: opt.color }}>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusOpt.color }} />
                      <span className="text-[13px] font-medium" style={{ color: statusOpt.color }}>
                        {statusOpt.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalStudents > 0 && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-[12px] text-gray-500">
                <span>Records per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] text-gray-700 focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-gray-500 mr-1">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalStudents)} of {totalStudents}
                </span>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>
                {visiblePages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-[12px] font-bold transition
                      ${p === page ? 'bg-[#5a4fcf] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View All Students */}
        {totalStudents > pageSize && (
          <button
            onClick={() => { setPageSize(totalStudents); setPage(1); }}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 text-[14px] font-semibold text-[#5a4fcf] flex items-center justify-center gap-2 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            View all students ({totalStudents})
          </button>
        )}
      </div>
      </div>

      {/* Floating Submit Button */}
      {canMark && roster.length > 0 && (
        <div className="fixed bottom-24 md:bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <button
            onClick={handleSaveAll}
            disabled={markAttendanceBulk.isPending}
            className="w-full max-w-[300px] bg-[#5a4fcf] text-white rounded-full py-3.5 text-[15px] font-bold shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70 pointer-events-auto"
          >
            {markAttendanceBulk.isPending ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
