import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { usePtmSlots, useRemoveSlot, useCancelBooking } from '../hooks/usePtm';
import { AddSlotModal } from './AddSlotModal';
import { BookSlotModal } from './BookSlotModal';

export function PtmPage() {
  const { can, profile } = useAuth();
  const canManageAny = can('ptm.manage');
  const isInstructor = !!profile?.instructorId;
  const canOpenSlots = canManageAny || isInstructor;
  const canBook = can('ptm.book');

  const { data: slots, isLoading, error } = usePtmSlots();
  const removeSlot = useRemoveSlot();
  const cancelBooking = useCancelBooking();
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);

  const columns = [
    { key: 'date', header: 'Date', render: (row) => new Date(row.slot_date).toLocaleDateString() },
    { key: 'time', header: 'Time', render: (row) => `${row.start_time}–${row.end_time}` },
    { key: 'instructor', header: 'Instructor', render: (row) => `${row.instructor_first_name} ${row.instructor_last_name}` },
    { key: 'class', header: 'Class', render: (row) => row.cohort_name || 'Any' },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.booking_id ? (
          <Badge variant="inactive">Booked — {row.learner_first_name} {row.learner_last_name}</Badge>
        ) : (
          <Badge variant="active">Open</Badge>
        )
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          {!row.booking_id && canBook && (
            <button onClick={() => setBookingSlot(row)} className="text-xs font-semibold text-accent-dark hover:underline">
              Book
            </button>
          )}
          {row.booking_id && (canManageAny || (profile?.learnerId && profile.learnerId === row.learner_id)) && (
            <button
              onClick={() => cancelBooking.mutate(row.booking_id)}
              className="text-xs font-semibold text-danger hover:opacity-80"
            >
              Cancel Booking
            </button>
          )}
          {(canManageAny || (isInstructor && profile.instructorId === row.instructor_id)) && (
            <button
              onClick={() => {
                if (window.confirm('Remove this slot?')) removeSlot.mutate(row.id);
              }}
              className="text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              Remove
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Parent-Teacher Meetings</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">PTM Scheduling</h1>
        </div>
        {canOpenSlots && (
          <button
            onClick={() => setShowAddSlot(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Open Slot
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {slots && <DataTable columns={columns} rows={slots} rowKey={(row) => row.id} emptyMessage="No meeting slots open yet." />}
      </div>

      {showAddSlot && <AddSlotModal canManageAny={canManageAny} onClose={() => setShowAddSlot(false)} />}
      {bookingSlot && <BookSlotModal slot={bookingSlot} onClose={() => setBookingSlot(null)} />}
    </div>
  );
}
