import { Filter, Calendar } from 'lucide-react';
import { OmniSearch } from './OmniSearch';

export function TeacherHeader({ 
  showSearch = false, 
  onSearch, 
  searchValue,
  searchPlaceholder = "Search students, class, apps ..",
  actionIcon, 
  onActionClick,
  headerStats = []
}) {
  return (
    <div className="relative mb-6 z-40">
      {/* Stats below the global Topbar */}
      {headerStats.length > 0 && (
        <div className="mt-2 mb-4 bg-white/95 backdrop-blur-md rounded-[20px] p-4 flex flex-wrap md:flex-nowrap items-center gap-4 relative shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-white">
          {headerStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className={`flex items-center gap-3.5 ${idx !== headerStats.length - 1 ? 'pr-4 md:pr-8 border-r border-gray-100' : ''}`}>
                <div className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center text-white ${stat.color || 'bg-indigo-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-gray-500 text-[13px] font-bold">{stat.label}</div>
                  <div className="text-gray-900 font-extrabold text-[20px] leading-tight">{stat.value}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Optional Search / Action Bar */}
      {showSearch && (
        <div className="mt-2 flex gap-3 px-1 relative z-20">
          <OmniSearch 
            placeholder={searchPlaceholder} 
            value={searchValue} 
            onChange={onSearch} 
          />
          {actionIcon === 'filter' && (
            <button onClick={onActionClick} className="w-[50px] h-[50px] bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-md border border-gray-50 flex-shrink-0 hover:bg-gray-50 transition-colors">
              <Filter className="w-[22px] h-[22px]" strokeWidth={2} />
            </button>
          )}
          {actionIcon === 'calendar' && (
            <button onClick={onActionClick} className="w-[50px] h-[50px] bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md border border-indigo-700 flex-shrink-0 hover:bg-indigo-700 transition-colors">
              <Calendar className="w-[22px] h-[22px]" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
