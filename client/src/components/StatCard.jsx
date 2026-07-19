export function StatCard({ label, value, delta, deltaDirection = 'up' }) {
  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="h-1 bg-accent" />
      <div className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</div>
        <div className="mt-1.5 font-display text-[28px] font-bold tracking-tight text-ink-900">
          {value}
        </div>
        {delta && (
          <div
            className={`mt-1 text-xs font-bold ${
              deltaDirection === 'up' ? 'text-success' : 'text-danger'
            }`}
          >
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}
