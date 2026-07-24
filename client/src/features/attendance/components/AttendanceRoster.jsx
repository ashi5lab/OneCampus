import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useAttendanceForCohortDate, useMarkAttendance } from '../hooks/useAttendance';
import { Avatar } from '../../../components/Avatar';
import { TeacherHeader } from '../../../components/TeacherHeader';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Search } from 'lucide-react';

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function generateDateRange() {
  const dates = [];
  const today = new Date();
  for (let i = -15; i <= 15; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: i === 0,
    });
  }
  return dates;
}

export function AttendanceRoster({ lockedCohortId }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canMark = can('attendance.mark');
  
  const [cohortId, setCohortId] = useState(lockedCohortId || '');
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: cohorts } = useCohorts({ enabled: !lockedCohortId });
  const { data: allLearners } = useLearners();
  const { data: existingRecords, isLoading: loadingRoster } = useAttendanceForCohortDate(cohortId, date);
  const markAttendance = useMarkAttendance();

  const selectedCohort = useMemo(
    () => (cohorts || []).find((c) => String(c.id) === String(cohortId)),
    [cohorts, cohortId]
  );

  const roster = useMemo(
    () => (allLearners || []).filter((learner) => String(learner.cohort_id) === String(cohortId)),
    [allLearners, cohortId]
  );

  useEffect(() => {
    if (!cohortId || !date) return;
    const nextStatuses = {};
    for (const learner of roster) {
      const existing = (existingRecords || []).find((r) => r.learner_id === learner.id);
      nextStatuses[learner.id] = existing?.status || 'present';
    }
    setStatuses(nextStatuses);
  }, [cohortId, date, roster, existingRecords]);

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase().trim();
    return roster.filter((l) => {
      const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
      const regNo = (l.registry_no || '').toLowerCase();
      return fullName.includes(q) || regNo.includes(q);
    });
  }, [roster, searchQuery]);

  async function handleSaveAll() {
    try {
      await Promise.all(
        roster.map((learner) =>
          markAttendance.mutateAsync({
            learner_id: learner.id,
            cohort_id: Number(cohortId),
            date,
            status: statuses[learner.id] || 'present',
            remarks: null
          })
        )
      );
      alert('Attendance saved successfully');
      navigate('/app/attendance');
    } catch (err) {
      alert(err.message || 'Failed to save attendance');
    }
  }

  const handleStatusChange = (learnerId, status) => {
    setStatuses(prev => ({ ...prev, [learnerId]: status }));
  };

  const datesList = useMemo(() => generateDateRange(), []);

  return (
    <div className="bg-[#f8f9fe] min-h-screen pb-32 font-body relative">
      {/* Custom Header matching Teacher UI */}
      <div className="bg-[#5a4fcf] text-white pt-10 pb-6 px-6 rounded-b-[40px] shadow-sm relative z-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/app/attendance')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[18px] font-bold">{selectedCohort?.name || 'Class Attendance'}</h1>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>

        {/* Horizontal Date Selector */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {datesList.map((d) => (
            <button
              key={d.iso}
              onClick={() => setDate(d.iso)}
              className={`flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all ${
                date === d.iso 
                  ? 'bg-white text-[#5a4fcf] shadow-md' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span className={`text-[12px] font-semibold ${date === d.iso ? 'text-[#5a4fcf]' : 'text-white/70'}`}>
                {d.dayName}
              </span>
              <span className={`text-[20px] font-bold ${date === d.iso ? 'text-[#5a4fcf]' : 'text-white'}`}>
                {d.dayNumber}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 relative z-20 mt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-gray-900 rounded-2xl pl-12 pr-4 py-3.5 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#5a4fcf]/50 shadow-sm border border-gray-100"
          />
        </div>

        {/* Student List */}
        {loadingRoster ? (
          <div className="text-center p-8 text-gray-500 text-sm">Loading students...</div>
        ) : filteredRoster.length === 0 ? (
          <div className="text-center p-8 text-gray-500 text-sm">No students found.</div>
        ) : (
          <div className="space-y-3">
            {filteredRoster.map((learner, idx) => {
              const currentStatus = statuses[learner.id] || 'present';
              
              return (
                <div key={learner.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="text-[12px] font-bold text-gray-400 w-5">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  
                  <Avatar name={`${learner.first_name} ${learner.last_name}`} src={learner.photo_url} size={44} className="rounded-xl flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-gray-900 truncate">
                      {learner.first_name} {learner.last_name}
                    </div>
                    <div className="text-[12px] font-medium text-gray-500">
                      Roll No: {learner.registry_no || 'N/A'}
                    </div>
                  </div>

                  {canMark && (
                    <div className="flex items-center bg-gray-50 rounded-xl p-1 shadow-inner border border-gray-100">
                      <button
                        onClick={() => handleStatusChange(learner.id, 'present')}
                        className={`w-10 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                          currentStatus === 'present' 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        P
                      </button>
                      <button
                        onClick={() => handleStatusChange(learner.id, 'absent')}
                        className={`w-10 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                          currentStatus === 'absent' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleStatusChange(learner.id, 'late')}
                        className={`w-10 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                          currentStatus === 'late' 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        L
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Submit Button */}
      {canMark && filteredRoster.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <button
            onClick={handleSaveAll}
            disabled={markAttendance.isPending}
            className="w-full bg-[#5a4fcf] text-white rounded-2xl py-4 text-[15px] font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70"
          >
            {markAttendance.isPending ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
