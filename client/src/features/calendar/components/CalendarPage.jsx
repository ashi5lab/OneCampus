import { useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { ITEM_TYPE_META, WEEKDAY_LABELS } from '../types';
import { useAgenda, useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../hooks/useCalendar';
import { EventFormModal } from './EventFormModal';

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildGrid(monthAnchor) {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function recurrenceSummary(event) {
  if (!event.is_recurring) {
    return event.end_date && event.end_date !== event.start_date ? `${event.start_date} → ${event.end_date}` : event.start_date;
  }
  const days = event.recurrence_days || [];
  if (event.recurrence_type === 'weekly') return `Weekly on ${days.map((d) => WEEKDAY_LABELS[d]).join(', ')}`;
  if (event.recurrence_type === 'monthly') return `Monthly on ${days.join(', ')}`;
  if (event.recurrence_type === 'yearly') return `Yearly on ${event.start_date.slice(5)}`;
  return event.start_date;
}

export function CalendarPage() {
  const { can } = useAuth();
  const canManage = can('calendar.manage');

  const today = useMemo(() => new Date(), []);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showManageList, setShowManageList] = useState(false);

  const gridDays = useMemo(() => buildGrid(monthAnchor), [monthAnchor]);
  const rangeFrom = toDateKey(gridDays[0]);
  const rangeTo = toDateKey(gridDays[gridDays.length - 1]);

  const { data: agenda, isLoading, error } = useAgenda(rangeFrom, rangeTo);
  const { data: rawEvents } = useCalendarEvents({ enabled: canManage && showManageList });
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of agenda || []) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }
    return map;
  }, [agenda]);

  const selectedItems = itemsByDate[selectedDate] || [];
  const todayKey = toDateKey(today);

  function goToMonth(offset) {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
  }

  function handleSubmit(values) {
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, payload: values }, { onSuccess: closeForm });
    } else {
      createEvent.mutate(values, { onSuccess: closeForm });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Calendar</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Org Calendar</h1>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowManageList((v) => !v)}
              className="rounded border border-border px-3.5 py-2.5 text-[13.5px] font-semibold text-ink-700"
            >
              {showManageList ? 'Hide' : 'Manage'} Events
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Add Event/Holiday
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(ITEM_TYPE_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">{error.message}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Month grid */}
        <div className="overflow-hidden rounded border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button onClick={() => goToMonth(-1)} className="rounded px-2.5 py-1 text-sm font-semibold text-ink-700 hover:bg-surface-muted">
              ‹
            </button>
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-bold text-ink-900">{MONTH_LABEL.format(monthAnchor)}</div>
              <button
                onClick={() => {
                  setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(todayKey);
                }}
                className="rounded border border-border px-2 py-0.5 text-[10.5px] font-semibold text-ink-500 hover:bg-surface-muted"
              >
                Today
              </button>
            </div>
            <button onClick={() => goToMonth(1)} className="rounded px-2.5 py-1 text-sm font-semibold text-ink-700 hover:bg-surface-muted">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-1 py-2 text-center text-[10.5px] font-bold uppercase tracking-wide text-ink-500">
                {label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
          ) : (
            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const dateKey = toDateKey(day);
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const items = itemsByDate[dateKey] || [];
                const visibleItems = items.slice(0, 3);
                const overflowCount = items.length - visibleItems.length;
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === todayKey;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`flex min-h-[94px] flex-col items-stretch gap-1 border-b border-r border-border p-1.5 text-left last:border-r-0 hover:bg-surface-muted ${
                      isSelected ? 'bg-accent/10' : ''
                    } ${!inMonth ? 'opacity-40' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-semibold ${
                        isToday ? 'bg-ink-900 text-white' : 'text-ink-900'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      {visibleItems.map((item) => (
                        <span
                          key={item.id}
                          className={`truncate rounded px-1 py-[1px] text-[9.5px] font-semibold leading-[14px] text-white ${
                            ITEM_TYPE_META[item.type]?.dot || 'bg-ink-500'
                          }`}
                        >
                          {item.title}
                        </span>
                      ))}
                      {overflowCount > 0 && <span className="px-1 text-[9.5px] font-semibold text-ink-500">+{overflowCount} more</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail */}
        <div className="rounded border border-border bg-surface p-4">
          <div className="mb-3 text-[13.5px] font-bold text-ink-900">{DAY_LABEL.format(new Date(`${selectedDate}T00:00:00`))}</div>
          {selectedItems.length === 0 && <div className="text-[13px] text-ink-500">Nothing scheduled.</div>}
          <div className="space-y-2.5">
            {selectedItems.map((item) => (
              <div key={item.id} className="rounded border border-border p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${ITEM_TYPE_META[item.type]?.dot || 'bg-ink-500'}`} />
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">{ITEM_TYPE_META[item.type]?.label || item.type}</span>
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-ink-900">{item.title}</div>
                {item.description && <div className="mt-0.5 text-[12px] text-ink-500">{item.description}</div>}
                {canManage && item.source === 'calendar' && (
                  <div className="mt-2 flex gap-3 border-t border-border pt-2">
                    <button
                      onClick={() => {
                        const raw = (rawEvents || []).find((e) => e.id === item.eventId);
                        setEditingEvent(raw || { id: item.eventId, ...item, start_date: item.date, end_date: item.endDate });
                        setShowForm(true);
                      }}
                      className="text-[11px] font-semibold text-ink-500 hover:text-ink-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${item.title}"?`)) deleteEvent.mutate(item.eventId);
                      }}
                      className="text-[11px] font-semibold text-danger hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {canManage && showManageList && (
        <div className="mt-6 overflow-hidden rounded border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-[13.5px] font-bold text-ink-900">All Events &amp; Holidays</div>
          <DataTable
            rows={rawEvents || []}
            rowKey={(row) => row.id}
            emptyMessage="No calendar events yet."
            columns={[
              { key: 'title', header: 'Title', render: (row) => row.title },
              {
                key: 'type',
                header: 'Type',
                render: (row) => ITEM_TYPE_META[row.event_type]?.label || row.event_type
              },
              { key: 'schedule', header: 'Schedule', render: (row) => recurrenceSummary(row) },
              { key: 'audience', header: 'Audience', render: (row) => row.audience },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditingEvent(row);
                        setShowForm(true);
                      }}
                      className="text-xs font-semibold text-ink-500 hover:text-ink-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${row.title}"?`)) deleteEvent.mutate(row.id);
                      }}
                      className="text-xs font-semibold text-danger hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}

      {showForm && (
        <EventFormModal
          initialData={editingEvent}
          onClose={closeForm}
          onSubmit={handleSubmit}
          submitting={createEvent.isPending || updateEvent.isPending}
          submitError={createEvent.error?.message || updateEvent.error?.message}
        />
      )}
    </div>
  );
}
