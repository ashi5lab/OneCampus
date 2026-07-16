import { useState } from 'react';

// Horizontal bars — reads better than vertical columns for the category
// names this app plots (cohort/exam titles, attendance statuses), and the
// label sits directly beside its bar so identity never depends on color
// alone (no separate legend box needed even when bars use different
// per-category colors, since each one is already text-labeled).
//
// `data`: [{ label, value, color? }] — color defaults to the `color` prop
// (single-series case: every bar the same accent hue). Bar thickness caps
// at 24px per the mark spec; the tip carries the value, not a legend.
export function HorizontalBarChart({ data, color = 'var(--accent)', valueSuffix = '%', maxValue, emptyMessage = 'No data yet.' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const rows = data || [];

  if (rows.length === 0) {
    return <div className="flex h-24 items-center justify-center text-sm text-ink-500">{emptyMessage}</div>;
  }

  const max = maxValue ?? Math.max(1, ...rows.map((r) => r.value || 0));

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const pct = Math.max(0, Math.min(100, ((row.value || 0) / max) * 100));
        const barColor = row.color || color;
        return (
          <div
            key={row.label}
            className="group"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="truncate pr-2 font-medium text-ink-700">{row.label}</span>
              <span className={`flex-shrink-0 font-bold text-ink-900 ${hoverIndex === i ? 'opacity-100' : 'opacity-80'}`}>
                {row.value ?? '—'}{row.value != null ? valueSuffix : ''}
              </span>
            </div>
            <div className="h-3.5 max-h-6 w-full rounded bg-surface-muted">
              {/* Square at the baseline (left), 4px rounded at the data-end (right/tip) — mark spec. */}
              <div
                className="h-full rounded-r transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: barColor, maxWidth: '100%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
