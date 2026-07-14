export function StatCard({ label, value, delta, deltaDirection = 'up' }) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-xs font-bold text-ink-500">{label}</div>
      <div className="mt-1.5 font-display text-[26px] font-bold tracking-tight text-ink-900">
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
  );
}
