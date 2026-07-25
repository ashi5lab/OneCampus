import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { AttendanceRoster } from './AttendanceRoster';
import { MyAttendanceView } from './MyAttendanceView';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCohortAttendanceLogs } from '../hooks/useAttendance';
import { TeacherHeader } from '../../../components/TeacherHeader';
import { Avatar } from '../../../components/Avatar';
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

function ClassCard({ c, log }) {
  const isMarked = !!log;
  const presentCount = log?.present_count ?? null;
  const totalLearners = log?.total_learners ?? c.learner_count ?? null;
  return (
    <Link
      to={`/app/attendance/${c.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center text-[18px] font-bold">
            {(c.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-[16px] font-bold text-gray-900">{c.name}</div>
            <div className="text-[12px] font-medium text-gray-500">
              {c.learner_count != null ? `${c.learner_count} students` : 'Students'}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      <div className="flex gap-2 mt-1">
        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            Status
          </div>
          {isMarked ? (
            <div className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Marked</div>
          ) : (
            <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Pending</div>
          )}
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Present
          </div>
          <div className="text-[11px] font-bold text-gray-900">
            {isMarked && presentCount != null && totalLearners != null
              ? `${presentCount}/${totalLearners}`
              : '--/--'}
          </div>
        </div>
      </div>
    </Link>
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
    (logsData?.data || []).forEach((l) => { map[String(l.cohort_id)] = l; });
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
    <div className="bg-[#f8f9fe] min-h-screen pb-24 font-body">
      <TeacherHeader
        title="Mark Attendance"
        subtitle="Select a class to continue"
      />

      <div className="px-4 relative z-20 space-y-4 pt-4">
        {/* Student Search Autocomplete */}
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
                  placeholder="Search by name or admission number..."
                  className="flex-1 text-[14px] outline-none text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searchQuery.trim() === '' ? (
                  <div className="px-4 py-4 text-[13px] text-gray-400 text-center">
                    Type to search students...
                  </div>
                ) : filteredLearners.length === 0 ? (
                  <div className="px-4 py-4 text-[13px] text-gray-500 text-center">No students found</div>
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
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition border-b border-gray-50 last:border-0 text-left"
                      >
                        <Avatar name={`${l.first_name} ${l.last_name}`} src={l.photo_url} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-gray-900 truncate">
                            {l.first_name} {l.last_name}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-gray-500 mt-0.5">
                            <span>{l.registry_no || 'N/A'}</span>
                            {className && (
                              <>
                                <span className="w-1 h-1 bg-gray-300 rounded-full inline-block" />
                                <span>{className}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
          <div className="text-center py-8 text-gray-400 text-sm">Loading classes...</div>
        )}
        {!isSearching && !cohortsLoading && list.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No classes found.</div>
        )}
        {!isSearching && !cohortsLoading && list.map((c) => (
          <ClassCard key={c.id} c={c} log={logsMap[String(c.id)]} />
        ))}
      </div>
    </div>
  );
}
