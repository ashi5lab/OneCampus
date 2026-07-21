import { FiChevronRight } from 'react-icons/fi';

export function StatCard({ label, value, delta, deltaDirection = 'up', icon: Icon, color = 'text-accent', onClick }) {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">
            {value}
          </div>
          {delta && (
            <div
              className={`mt-1 text-xs font-bold ${
                deltaDirection === 'up' ? 'text-success' : 'text-danger'
              }`}
            >
              {deltaDirection === 'up' ? '↑' : '↓'} {delta}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`rounded-full p-2.5 ${color} bg-opacity-10 bg-current`}>
            <Icon size={20} className="stroke-current" />
          </div>
        )}
      </div>
      
      {onClick && (
        <div className="mt-3 flex items-center gap-1 border-t border-border pt-3 text-xs font-semibold text-accent">
          View Details
          <FiChevronRight size={14} />
        </div>
      )}
    </div>
  );
}
