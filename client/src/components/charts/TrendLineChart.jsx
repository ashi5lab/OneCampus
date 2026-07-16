import { useMemo, useState } from 'react';

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

// Rounds a max value up to a "clean" tick ceiling (0/25/50/... or 0/20/40...)
// so y-axis gridlines read as round numbers rather than raw data maxima.
function niceCeiling(max) {
  if (max <= 0) return 10;
  const step = max <= 20 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5 / 10) * 10;
  return Math.ceil(max / step) * step;
}

// Single-series line + area chart (attendance rate over time, etc.) — one
// series needs no legend per the dataviz mark spec; the chart title already
// names what's plotted. 2px line, ~10% opacity area wash, an end-dot with a
// direct value label (the only label drawn — never one per point), hairline
// gridlines, and a hover crosshair + tooltip.
export function TrendLineChart({ data, color = 'var(--accent)', valueSuffix = '%', emptyMessage = 'No data yet.' }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = (data || []).filter((d) => d.value !== null && d.value !== undefined);
  const maxValue = niceCeiling(Math.max(10, ...points.map((d) => d.value)));
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const coords = useMemo(
    () =>
      (data || []).map((d, i) => ({
        ...d,
        x: PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2),
        y: d.value === null || d.value === undefined ? null : PADDING.top + innerHeight - (d.value / maxValue) * innerHeight
      })),
    [data, maxValue, innerWidth, innerHeight]
  );

  if (!data || data.length === 0 || points.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-ink-500">{emptyMessage}</div>;
  }

  const valid = coords.filter((c) => c.y !== null);
  const linePath = valid.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${valid[valid.length - 1].x} ${PADDING.top + innerHeight} L ${valid[0].x} ${PADDING.top + innerHeight} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f));
  const last = valid[valid.length - 1];
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

  function handleMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => {
          const y = PADDING.top + innerHeight - (tick / maxValue) * innerHeight;
          return (
            <g key={tick}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={PADDING.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--ink-500)">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={color} fillOpacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" />
            <text x={last.x} y={last.y - 10} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--ink-900)">
              {last.value}{valueSuffix}
            </text>
          </>
        )}

        {coords.map(
          (c, i) =>
            i % Math.ceil(coords.length / 6) === 0 && (
              <text key={c.date || i} x={c.x} y={HEIGHT - 8} textAnchor="middle" fontSize="9.5" fill="var(--ink-500)">
                {c.label}
              </text>
            )
        )}

        {hovered && hovered.y !== null && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={PADDING.top} y2={PADDING.top + innerHeight} stroke="var(--ink-500)" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </>
        )}
      </svg>

      {hovered && hovered.y !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-ink-900 shadow-lg"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
        >
          {hovered.label}: {hovered.value}{valueSuffix}
        </div>
      )}
    </div>
  );
}
