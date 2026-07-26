import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { PageHeader } from '../../../components/PageHeader';
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
  ];

  function slotActions(row) {
    return [
      { key: 'book', label: 'Book', hidden: !(!row.booking_id && canBook), onClick: () => setBookingSlot(row) },
      {
        key: 'cancel',
        label: 'Cancel Booking',
        variant: 'danger',
        hidden: !(row.booking_id && (canManageAny || (profile?.learnerId && profile.learnerId === row.learner_id))),
        onClick: () => cancelBooking.mutate(row.booking_id)
      },
      {
        key: 'remove',
        label: 'Remove',
        hidden: !(canManageAny || (isInstructor && profile.instructorId === row.instructor_id)),
        confirm: 'Remove this slot?',
        onClick: () => removeSlot.mutate(row.id)
      }
    ];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Parent-Teacher Meetings"
        title="PTM Scheduling"
        actions={
          canOpenSlots && (
            <button
              onClick={() => setShowAddSlot(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Open Slot
            </button>
          )
        }
      />

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {slots && <DataTable columns={columns} rows={slots} rowKey={(row) => row.id} emptyMessage="No meeting slots open yet." mobileCompact actions={slotActions} />}
      </div>

      {showAddSlot && <AddSlotModal canManageAny={canManageAny} onClose={() => setShowAddSlot(false)} />}
      {bookingSlot && <BookSlotModal slot={bookingSlot} onClose={() => setBookingSlot(null)} />}
    </div>
  );
}
