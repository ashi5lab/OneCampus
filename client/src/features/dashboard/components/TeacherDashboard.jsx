import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, ClipboardList, CalendarDays, Speaker, Calendar as CalendarIcon, FileText, GraduationCap, Plus, CalendarCheck, ShieldAlert, Zap, ChevronRight } from 'lucide-react';
import { TeacherHeader } from '../../../components/TeacherHeader';

export function TeacherDashboard() {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef(null);

  useEffect(() => {
    if (!fabOpen) return;
    const handleOutsideClick = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setFabOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [fabOpen]);

  const fabActions = [
    { label: 'Attendance', icon: CalendarCheck, path: '/app/attendance' },
    { label: 'Discipline', icon: ShieldAlert, path: '/app/discipline' },
  ];
  const glanceCards = [
    { icon: Users, value: '4', label: 'My Classes', color: 'text-indigo-600 bg-indigo-50' },
    { icon: CheckCircle2, value: '3/4', label: 'Attendance Marked', color: 'text-indigo-600 bg-indigo-50' },
    { icon: ClipboardList, value: '8', label: 'Assignments To Grade', color: 'text-indigo-600 bg-indigo-50' },
    { icon: CalendarDays, value: '2', label: "Today's Classes", subtitle: 'Next: 10:30 AM', color: 'text-indigo-600 bg-indigo-50' },
  ];

  const schedule = [
    { time: '08:30 AM', end: '09:15 AM', class: 'Class 8A', subject: 'Science', status: 'Completed', color: 'bg-indigo-50 text-indigo-700' },
    { time: '10:30 AM', end: '11:15 AM', class: 'Class 10A', subject: 'Physics', status: 'Next', color: 'bg-purple-100 text-purple-700' },
    { time: '12:00 PM', end: '12:45 PM', class: 'Class 9B', subject: 'Lab', status: 'Upcoming', color: 'bg-gray-100 text-gray-600' },
  ];

  const notices = [
    { icon: Speaker, title: 'School will remain closed on 25th May', subtitle: 'Whole School • 10 mins ago', color: 'text-indigo-600 bg-indigo-50' },
    { icon: CalendarIcon, title: 'PTM scheduled on 1st June 2024', subtitle: 'Class 10A • 2 hours ago', color: 'text-indigo-600 bg-indigo-50' },
  ];

  const events = [
    { month: 'MAY', date: '24', title: 'Science Exhibition', subtitle: 'Whole School', time: '09:00 AM' },
    { month: 'MAY', date: '27', title: 'Unit Test - Physics', subtitle: 'Class 9B', time: '10:30 AM' },
  ];

  return (
    <div className="bg-[#f8f9fe] min-h-screen pb-24 font-body">
      {/* Top curved banner with search and greeting */}
      <TeacherHeader 
        showSearch={true} 
        searchPlaceholder="Search students, class, apps .." 
        headerStats={[
          { label: 'Students', value: '1,248', icon: Users, color: 'bg-[#917bf6]' },
          { label: 'Classes', value: '48', icon: GraduationCap, color: 'bg-[#917bf6]' }
        ]}
      />

      {/* Main Content */}
      <div className="px-4 relative z-20 space-y-6 pt-4">

        {/* Quick-action shortcut row */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Mark Attendance Now */}
          <button
            type="button"
            onClick={() => navigate('/app/attendance')}
            className="flex items-center gap-3 bg-[#e8f9ee] rounded-2xl px-4 py-3.5 shadow-sm border border-[#c3edcf] active:scale-[0.98] transition-transform text-left w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#166534] leading-tight">Mark Attendance Now</div>
              <div className="text-[11px] text-[#16a34a] mt-0.5 font-medium">Quickly mark student attendance</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
          </button>

          {/* Log Discipline */}
          <button
            type="button"
            onClick={() => navigate('/app/discipline?openLog=1')}
            className="flex items-center gap-3 bg-[#fff7ed] rounded-2xl px-4 py-3.5 shadow-sm border border-[#fed7aa] active:scale-[0.98] transition-transform text-left w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#7c2d12] leading-tight">Log Discipline</div>
              <div className="text-[11px] text-[#ea580c] mt-0.5 font-medium">Record student behavior</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#f97316] flex-shrink-0" />
          </button>
        </div>

        {/* Today at a glance */}
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 mb-3 md:mb-3">Today at a glance</h2>
          <div className="flex flex-col gap-2.5 md:flex-row md:overflow-x-auto md:pb-2 md:scroll-smooth md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:none] md:[scrollbar-width:none]">
            {glanceCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl p-3 md:p-4 shadow-sm md:min-w-[120px] flex-shrink-0 flex items-center md:flex-col md:items-start md:justify-between border border-gray-100 gap-3 md:gap-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center md:mb-3 flex-shrink-0 ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between md:block md:items-stretch">
                    <div>
                      <div className="text-[13px] md:text-[11px] font-medium text-gray-500 leading-tight">{card.label}</div>
                      {card.subtitle && <div className="text-[10px] font-semibold text-indigo-600 md:mt-1">{card.subtitle}</div>}
                    </div>
                    <div className="text-[18px] md:text-2xl font-bold text-gray-900 ml-2 md:ml-0">{card.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-gray-900">Today's Schedule</h2>
            <Link to="/app/timetable" className="text-xs font-semibold text-indigo-600">View Timetable</Link>
          </div>
          <div className="space-y-0 relative">
            {/* Vertical Line */}
            <div className="absolute left-[88px] top-4 bottom-8 w-px bg-indigo-200"></div>

            {schedule.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 pb-6 relative z-10">
                <div className="w-[72px] flex-shrink-0 text-right pt-2">
                  <div className="text-[12px] font-bold text-gray-900 leading-tight">{item.time}</div>
                  <div className="text-[10px] font-medium text-gray-500">{item.end}</div>
                </div>
                
                {/* Timeline Dot */}
                <div className="flex flex-col items-center pt-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'Completed' || item.status === 'Next' ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                </div>

                <div className={`flex-1 rounded-2xl p-4 border flex items-center justify-between ${item.status === 'Next' ? 'border-indigo-100 bg-[#fbfaff]' : 'border-gray-100 bg-white'}`}>
                  <div>
                    <div className="text-[14px] font-bold text-gray-900">{item.class}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5">{item.subject}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${item.color}`}>
                    {item.status}
                    {item.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notices */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-gray-900">Recent Notices</h2>
            <Link to="/app/notices" className="text-xs font-semibold text-indigo-600">View all</Link>
          </div>
          <div className="space-y-4">
            {notices.map((notice, idx) => {
              const Icon = notice.icon;
              return (
                <div key={idx} className={`flex items-center gap-4 ${idx !== notices.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center ${notice.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-gray-900 truncate">{notice.title}</div>
                    <div className="text-[11px] font-medium text-gray-500 mt-0.5">{notice.subtitle}</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0 ml-2"></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-gray-900">Upcoming Events</h2>
            <Link to="/app/calendar" className="text-xs font-semibold text-indigo-600">View calendar</Link>
          </div>
          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={idx} className={`flex items-center gap-4 ${idx !== events.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col flex-shrink-0 items-center justify-center">
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{event.month}</span>
                  <span className="text-[16px] font-extrabold text-gray-900 leading-none mt-0.5">{event.date}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 truncate">{event.title}</div>
                  <div className="text-[11px] font-medium text-gray-500 mt-0.5">{event.subtitle}</div>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                  {event.time}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <div ref={fabRef} className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
        {/* Bubble menu options */}
        {fabActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <div
              key={action.label}
              className={`flex items-center gap-2 transition-all duration-200 origin-bottom-right ${
                fabOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-2 pointer-events-none'
              }`}
              style={{ transitionDelay: fabOpen ? `${(fabActions.length - 1 - idx) * 50}ms` : '0ms' }}
            >
              <span className="bg-white text-gray-800 text-[13px] font-semibold px-3 py-1.5 rounded-full shadow-md border border-gray-100">
                {action.label}
              </span>
              <button
                type="button"
                onClick={() => { setFabOpen(false); navigate(action.path); }}
                className="w-10 h-10 rounded-full bg-[#5a4fcf] flex items-center justify-center shadow-lg"
              >
                <Icon className="w-5 h-5 text-white" />
              </button>
            </div>
          );
        })}

        {/* Main FAB */}
        <button
          type="button"
          onClick={() => setFabOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-[#5a4fcf] flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          aria-label="Quick actions"
        >
          <Plus
            className={`w-7 h-7 text-white transition-transform duration-200 ${fabOpen ? 'rotate-45' : 'rotate-0'}`}
          />
        </button>
      </div>
    </div>
  );
}
