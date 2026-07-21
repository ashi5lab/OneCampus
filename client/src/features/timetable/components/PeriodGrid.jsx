import { useMemo, useState } from 'react';
import { DAY_NAMES, DAY_ABBR } from '../types';

function sortedHours(periods) {
  const hours = [...new Set(periods.map((p) => p.schedule_data?.hour).filter(Boolean))];
  return hours.sort((a, b) => a.localeCompare(b));
}

// Mobile day-by-day agenda — the full 7-column grid needs horizontal
// scrolling to be readable at all, which doesn't work well on a phone.
// Pick one weekday at a time instead and list just that day's periods
// vertically, sorted by time.
function DayAgenda({ periods, canEdit, onCardClick, onAddClick, renderCell }) {
  const sorted = useMemo(
    () => [...periods].sort((a, b) => (a.schedule_data?.hour || '').localeCompare(b.schedule_data?.hour || '')),
    [periods]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-6 text-center text-[13px] text-ink-500">
        {canEdit ? (
          <button type="button" onClick={onAddClick} className="font-semibold text-accent-dark">
            + Add a period
          </button>
        ) : (
          'Nothing scheduled.'
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((period) => (
        <button
          key={period.id}
          type="button"
          onClick={() => canEdit && onCardClick(period)}
          className={`flex w-full items-center gap-3 rounded border border-border bg-surface p-3 text-left ${
            canEdit ? 'hover:bg-surface-muted' : 'cursor-default'
          }`}
        >
          <div className="w-[76px] shrink-0 text-[11.5px] font-bold text-ink-700">{period.schedule_data?.hour}</div>
          <div className="min-w-0 flex-1 text-[13px]">{renderCell(period)}</div>
        </button>
      ))}
      {canEdit && (
        <button
          type="button"
          onClick={onAddClick}
          className="w-full rounded border border-dashed border-border p-2.5 text-center text-xs font-semibold text-ink-500 hover:bg-surface-muted"
        >
          + Add Period
        </button>
      )}
    </div>
  );
}

// Shared by TimetablePage (the full, class-selectable page reached from
// More) and ClassTimetableTab (the cohort-locked tab embedded in the Class
// channel) — same grid, same mobile day-agenda fallback, just fed a
// different periods list and canEdit flag by the caller.
export function PeriodGrid({ periods, isLoading, canEdit, onCellClick, onEmptyCellClick, renderCell }) {
  const hours = useMemo(() => sortedHours(periods || []), [periods]);
  const [selectedDay, setSelectedDay] = useState(() => DAY_NAMES[new Date().getDay()]);

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (hours.length === 0) {
    return <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">No periods scheduled yet.</div>;
  }

  return (
    <>
      {/* Desktop: the full weekly grid */}
      <div className="hidden overflow-x-auto rounded border border-border bg-surface md:block">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className="w-24 border-b border-r border-border bg-surface-muted px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-500">
                Time
              </th>
              {DAY_NAMES.map((day) => (
                <th
                  key={day}
                  className="border-b border-r border-border bg-surface-muted px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-500 last:border-r-0"
                >
                  {DAY_ABBR[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="border-b border-r border-border px-3 py-2 align-top text-[11.5px] font-semibold text-ink-700 whitespace-nowrap">
                  {hour}
                </td>
                {DAY_NAMES.map((day) => {
                  const period = (periods || []).find((p) => p.schedule_data?.hour === hour && (p.schedule_data?.days || []).includes(day));
                  return (
                    <td key={day} className="border-b border-r border-border p-1 align-top last:border-r-0">
                      {period ? (
                        <button
                          type="button"
                          onClick={() => canEdit && onCellClick(period)}
                          className={`w-full rounded p-1.5 text-left text-[11.5px] ${
                            canEdit ? 'cursor-pointer hover:bg-surface-muted' : 'cursor-default'
                          }`}
                        >
                          {renderCell(period)}
                        </button>
                      ) : canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEmptyCellClick({ day, hour })}
                          className="flex h-full min-h-[44px] w-full items-center justify-center rounded text-ink-500/40 hover:bg-surface-muted hover:text-ink-500"
                        >
                          +
                        </button>
                      ) : (
                        <div className="min-h-[44px]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one day at a time, no horizontal scrolling */}
      <div className="md:hidden">
        {/* grid, not a scroll strip — all 7 days must be reachable without
            any horizontal scrolling, even on the narrowest phone screens */}
        <div className="mb-3 grid grid-cols-7 gap-1">
          {DAY_NAMES.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`rounded-full py-1.5 text-center text-[11px] font-semibold ${
                selectedDay === day ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
              }`}
            >
              {DAY_ABBR[day][0]}
            </button>
          ))}
        </div>
        <DayAgenda
          periods={(periods || []).filter((p) => (p.schedule_data?.days || []).includes(selectedDay))}
          canEdit={canEdit}
          onCardClick={onCellClick}
          onAddClick={() => onEmptyCellClick({ day: selectedDay, hour: undefined })}
          renderCell={renderCell}
        />
      </div>
    </>
  );
}
