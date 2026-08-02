import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { AttendanceRoster } from './AttendanceRoster';
import { MyAttendanceView } from './MyAttendanceView';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCohortAttendanceLogs } from '../hooks/useAttendance';
import { TeacherHeader } from '../../../components/TeacherHeader';
import { Avatar } from '../../../components/Avatar';
import { FlatList, FlatRow } from '../../../components/FlatList';
import { ChevronRight, Clock, CheckCircle2, Search, ChevronDown } from 'lucide-react';

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function AttendancePage() {
  const { can } = useAuth();
  const { cohortId } = useParams();
  const isMarker = can('attendance.mark');

  if (!isMarker) {
    return (
      <div>
        <PageHeader title="My Attendance" />
        <MyAttendanceView />
      </div>
    );
  }

  if (cohortId) {
    return <AttendanceRoster lockedCohortId={cohortId} />;
  }

  return <AttendancePicker />;
}

// Never a grid — one column at every breakpoint — so this is a flat row
// (not a card) throughout, same reasoning as ClassPage's "My Classes".
function ClassRow({ c, log }) {
  const isMarked = !!log;
  const presentCount = log?.present_count ?? null;
  const totalLearners = log?.total_learners ?? c.learner_count ?? null;
  return (
    <FlatRow to={`/app/attendance/${c.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-light text-accent-dark rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0">
            {(c.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-bold text-ink-900 truncate">{c.name}</div>
            <div className="text-[12px] font-medium text-ink-500">
              {c.learner_count != null ? `${c.learner_count} students` : 'Students'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-300 flex-shrink-0" />
        </div>

        <div className="flex gap-2 mt-2.5 pl-[52px]">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-500">
            <Clock className="w-3.5 h-3.5" />
            Status
            {isMarked ? (
              <span className="text-[10.5px] font-bold text-success bg-success-light px-2 py-0.5 rounded-full">Marked</span>
            ) : (
              <span className="text-[10.5px] font-bold text-warning bg-warning-light px-2 py-0.5 rounded-full">Pending</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Present
            <span className="text-[10.5px] font-bold text-ink-900">
              {isMarked && presentCount != null && totalLearners != null ? `${presentCount}/${totalLearners}` : '--/--'}
            </span>
          </div>
        </div>
      </div>
    </FlatRow>
  );
}

function AttendancePicker() {
  const navigate = useNavigate();
  const { data: cohorts, isLoading: cohortsLoading } = useCohorts();
  const { data: allLearners } = useLearners();
  const today = useMemo(() => todayIso(), []);
  const { data: logsData } = useCohortAttendanceLogs(today);

  // Map cohort_id → log entry for O(1) lookup in the render loop
  const logsMap = useMemo(() => {
    const map = {};
    (Array.isArray(logsData) ? logsData : (logsData?.data || [])).forEach((l) => { map[String(l.cohort_id)] = l; });
    return map;
  }, [logsData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const cohortMap = useMemo(() => {
    const map = {};
    (cohorts || []).forEach((c) => { map[String(c.id)] = c.name; });
    return map;
  }, [cohorts]);

  const filteredLearners = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return (allLearners || [])
      .filter((l) => {
        const name = `${l.first_name} ${l.last_name}`.toLowerCase();
        const regNo = (l.registry_no || '').toLowerCase();
        return name.includes(q) || regNo.includes(q);
      })
      .slice(0, 15);
  }, [allLearners, searchQuery]);

  const list = cohorts || [];
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="bg-bg min-h-screen pb-24 font-body">
      <TeacherHeader
        title="Mark Attendance"
        subtitle="Select a class to continue"
      />

      <div className="px-4 relative z-20 space-y-4 pt-4">
        {/* Student Search Autocomplete */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="w-full bg-surface rounded-2xl px-4 py-3.5 shadow-sm border border-border-subtle flex items-center gap-3 text-left"
          >
            <Search className="w-5 h-5 text-ink-300 flex-shrink-0" />
            <span className={`flex-1 text-[14px] ${searchQuery ? 'text-ink-900 font-medium' : 'text-ink-300'}`}>
              {searchQuery || 'Search students'}
            </span>
            <ChevronDown className="w-4 h-4 text-ink-300 flex-shrink-0" />
          </button>

          {searchOpen && (
            <div className="absolute top-full left-0 right-0 bg-surface rounded-2xl shadow-xl border border-border-subtle mt-1 z-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
                <Search className="w-4 h-4 text-ink-300 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="flex-1 text-[14px] outline-none text-ink-900 placeholder:text-ink-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-ink-300 hover:text-ink-700 text-lg leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searchQuery.trim() === '' ? (
                  <div className="px-4 py-4 text-[13px] text-ink-300 text-center">
                    Type to search students...
                  </div>
                ) : filteredLearners.length === 0 ? (
                  <div className="px-4 py-4 text-[13px] text-ink-500 text-center">No students found</div>
                ) : (
                  filteredLearners.map((l) => {
                    const className = l.cohort_id ? cohortMap[String(l.cohort_id)] : null;
                    return (
                      <button
                        key={l.id}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          if (l.cohort_id) navigate(`/app/attendance/${l.cohort_id}?learner=${l.id}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent-light transition border-b border-border-subtle last:border-0 text-left"
                      >
                        <Avatar name={`${l.first_name} ${l.last_name}`} src={l.photo_url} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-ink-900 truncate">
                            {l.first_name} {l.last_name}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-ink-500 mt-0.5">
                            <span>{l.registry_no || 'N/A'}</span>
                            {className && (
                              <>
                                <span className="w-1 h-1 bg-ink-300 rounded-full inline-block" />
                                <span>{className}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-ink-300 flex-shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Class list — shown when not actively searching */}
        {!isSearching && cohortsLoading && (
          <div className="text-center py-8 text-ink-300 text-sm">Loading classes...</div>
        )}
        {!isSearching && !cohortsLoading && list.length === 0 && (
          <div className="text-center py-8 text-ink-300 text-sm">No classes found.</div>
        )}
        {!isSearching && !cohortsLoading && list.length > 0 && (
          <div className="-mx-4">
            <FlatList className="bg-surface">
              {list.map((c) => (
                <ClassRow key={c.id} c={c} log={logsMap[String(c.id)]} />
              ))}
            </FlatList>
          </div>
        )}
      </div>
    </div>
  );
}
