import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { Badge } from '../../../components/Badge';
import { useAuth } from '../../../contexts/AuthContext';
import { useVisitors } from '../../visitors/hooks/useVisitors';
import { useNotices } from '../../notices/hooks/useNotices';
import { usePtmSlots } from '../../ptm/hooks/usePtm';
import { useStaffAttendanceForDate } from '../../staffAttendance/hooks/useStaffAttendance';
import { useAnalyticsReport, useOverviewReport } from '../hooks/useReports';
import { UserCog, CalendarCheck, Bell, Footprints } from 'lucide-react';
import { PILLAR, tint } from '../lib/insightsTheme';

const COMMUNITY = PILLAR.community;

function OpsChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(COMMUNITY, 16), color: COMMUNITY }}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-ink-900">{value}</div>
        <div className="truncate text-[11.5px] text-ink-500">{label}</div>
      </div>
    </div>
  );
}

function SubHeading({ title }) {
  return <div className="mb-3 mt-8 text-[13.5px] font-bold text-ink-900 first:mt-0">{title}</div>;
}

function timeRange(row) {
  const t = (s) => (s ? s.slice(0, 5) : '');
  return `${t(row.start_time)}–${t(row.end_time)}`;
}

// Community & Operations — visitors, notices, parent-teacher meeting slots,
// and staff attendance, each with its own real, filterable table instead
// of a single summary number. Every fetch is gated behind that module's
// own permission (visitors.view/notices.view/ptm.view/staff_attendance.view)
// so a role missing one just doesn't see that section, rather than 403ing.
export function InsightsCommunityTab() {
  const { can } = useAuth();
  const { data: analytics } = useAnalyticsReport();
  const { data: overview } = useOverviewReport();

  const canVisitors = can('visitors.view');
  const canNotices = can('notices.view');
  const canPtm = can('ptm.view');
  const canStaffAttendance = can('staff_attendance.view');

  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorFrom, setVisitorFrom] = useState('');
  const [visitorTo, setVisitorTo] = useState('');
  const { data: visitors, isLoading: visitorsLoading } = useVisitors({ enabled: canVisitors });

  const [noticeSearch, setNoticeSearch] = useState('');
  const { data: notices, isLoading: noticesLoading } = useNotices({ enabled: canNotices });

  const [ptmSearch, setPtmSearch] = useState('');
  const [ptmStatus, setPtmStatus] = useState('');
  const { data: ptmSlots, isLoading: ptmLoading } = usePtmSlots({ enabled: canPtm });

  const [staffDate, setStaffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data: staffAttendance, isLoading: staffLoading } = useStaffAttendanceForDate(canStaffAttendance ? staffDate : null);

  const visitorRows = (visitors || []).filter((v) => {
    const day = v.check_in_time?.slice(0, 10);
    if (visitorFrom && day < visitorFrom) return false;
    if (visitorTo && day > visitorTo) return false;
    if (visitorSearch && !`${v.visitor_name} ${v.host_name}`.toLowerCase().includes(visitorSearch.toLowerCase())) return false;
    return true;
  });

  const noticeRows = (notices || []).filter((n) => !noticeSearch || n.title?.toLowerCase().includes(noticeSearch.toLowerCase()));

  const ptmRows = (ptmSlots || []).filter((s) => {
    if (ptmStatus === 'booked' && !s.booking_id) return false;
    if (ptmStatus === 'available' && s.booking_id) return false;
    if (!ptmSearch) return true;
    const haystack = `${s.instructor_first_name} ${s.instructor_last_name} ${s.cohort_name || ''} ${s.learner_first_name || ''} ${s.learner_last_name || ''}`;
    return haystack.toLowerCase().includes(ptmSearch.toLowerCase());
  });

  return (
    <div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <OpsChip icon={UserCog} label="Staff Attendance (30d)" value={analytics?.staffAttendanceRate30d != null ? `${analytics.staffAttendanceRate30d}%` : '—'} />
        <OpsChip icon={CalendarCheck} label="PTM Slots Booked" value={analytics && analytics.ptmTotalSlots > 0 ? `${analytics.ptmBookedSlots}/${analytics.ptmTotalSlots}` : '—'} />
        <OpsChip icon={Bell} label="Notices (30d)" value={overview?.noticesLast30Days ?? '—'} />
        <OpsChip icon={Footprints} label="Visitors Logged" value={visitors?.length ?? '—'} />
      </div>

      {canVisitors && (
        <>
          <SubHeading title="Visitor Log" />
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="search" placeholder="Search visitor or host…" value={visitorSearch} onChange={(e) => setVisitorSearch(e.target.value)} className="input w-48" />
                <input type="date" value={visitorFrom} onChange={(e) => setVisitorFrom(e.target.value)} className="input" />
                <span className="text-xs text-ink-500">to</span>
                <input type="date" value={visitorTo} onChange={(e) => setVisitorTo(e.target.value)} className="input" />
              </div>
              <ExportCsvButton
                filename="visitor-log"
                columns={[
                  { header: 'Visitor', value: (r) => r.visitor_name },
                  { header: 'Phone', value: (r) => r.visitor_phone || '' },
                  { header: 'Purpose', value: (r) => r.purpose || '' },
                  { header: 'Host', value: (r) => r.host_name || '' },
                  { header: 'Check In', value: (r) => r.check_in_time },
                  { header: 'Check Out', value: (r) => r.check_out_time || '' }
                ]}
                rows={visitorRows}
              />
            </div>
            {visitorsLoading ? (
              <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
            ) : (
              <DataTable
                rows={visitorRows}
                rowKey={(row) => row.id}
                emptyMessage="No visitors found."
                columns={[
                  { key: 'visitor_name', header: 'Visitor', sortable: true, render: (row) => row.visitor_name },
                  { key: 'purpose', header: 'Purpose', render: (row) => row.purpose || '—' },
                  { key: 'host_name', header: 'Host', sortable: true, render: (row) => row.host_name || '—' },
                  { key: 'check_in_time', header: 'Check In', sortable: true, render: (row) => new Date(row.check_in_time).toLocaleString() },
                  { key: 'check_out_time', header: 'Check Out', render: (row) => (row.check_out_time ? new Date(row.check_out_time).toLocaleString() : <Badge variant="pending">Still in</Badge>) }
                ]}
              />
            )}
          </div>
        </>
      )}

      {canPtm && (
        <>
          <SubHeading title="Parent-Teacher Meeting Slots" />
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="search" placeholder="Search instructor, class or student…" value={ptmSearch} onChange={(e) => setPtmSearch(e.target.value)} className="input w-56" />
                <select className="input" value={ptmStatus} onChange={(e) => setPtmStatus(e.target.value)}>
                  <option value="">All Slots</option>
                  <option value="booked">Booked</option>
                  <option value="available">Available</option>
                </select>
              </div>
              <ExportCsvButton
                filename="ptm-slots"
                columns={[
                  { header: 'Date', value: (r) => r.slot_date },
                  { header: 'Time', value: (r) => timeRange(r) },
                  { header: 'Instructor', value: (r) => `${r.instructor_first_name} ${r.instructor_last_name}` },
                  { header: 'Class', value: (r) => r.cohort_name || '' },
                  { header: 'Booked By', value: (r) => (r.learner_first_name ? `${r.learner_first_name} ${r.learner_last_name}` : '') }
                ]}
                rows={ptmRows}
              />
            </div>
            {ptmLoading ? (
              <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
            ) : (
              <DataTable
                rows={ptmRows}
                rowKey={(row) => row.id}
                emptyMessage="No PTM slots found."
                columns={[
                  { key: 'slot_date', header: 'Date', sortable: true, render: (row) => new Date(row.slot_date).toLocaleDateString() },
                  { key: 'time', header: 'Time', render: (row) => timeRange(row) },
                  { key: 'instructor', header: 'Instructor', sortable: true, sortValue: (row) => `${row.instructor_first_name} ${row.instructor_last_name}`, render: (row) => `${row.instructor_first_name} ${row.instructor_last_name}` },
                  { key: 'cohort_name', header: 'Class', render: (row) => row.cohort_name || '—' },
                  {
                    key: 'booking',
                    header: 'Booked By',
                    render: (row) => (row.learner_first_name
                      ? `${row.learner_first_name} ${row.learner_last_name}`
                      : <Badge variant="active">Available</Badge>)
                  }
                ]}
              />
            )}
          </div>
        </>
      )}

      {canStaffAttendance && (
        <>
          <SubHeading title="Staff Attendance" />
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <label className="text-xs font-semibold text-ink-700">Date</label>
              <input type="date" value={staffDate} onChange={(e) => setStaffDate(e.target.value)} className="input" />
            </div>
            {staffLoading ? (
              <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
            ) : (
              <DataTable
                rows={staffAttendance || []}
                rowKey={(row) => row.id}
                emptyMessage="No staff attendance marked for this date."
                columns={[
                  { key: 'name', header: 'Name', sortable: true, sortValue: (row) => `${row.first_name} ${row.last_name}`, render: (row) => `${row.first_name} ${row.last_name}` },
                  { key: 'staff_id', header: 'Staff ID', render: (row) => row.staff_id || '—' },
                  { key: 'staff_role', header: 'Role', render: (row) => (row.staff_role === 'instructor' ? 'Instructor' : 'Staff') },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge variant={row.status === 'present' ? 'active' : row.status === 'excused' ? 'pending' : 'inactive'}>
                        {row.status}
                      </Badge>
                    )
                  },
                  { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' }
                ]}
              />
            )}
          </div>
        </>
      )}

      {canNotices && (
        <>
          <SubHeading title="Notices" />
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
              <input type="search" placeholder="Search notice title…" value={noticeSearch} onChange={(e) => setNoticeSearch(e.target.value)} className="input w-56" />
              <ExportCsvButton
                filename="notices"
                columns={[
                  { header: 'Title', value: (r) => r.title },
                  { header: 'Audience', value: (r) => r.audience },
                  { header: 'Posted By', value: (r) => r.posted_by_username || '' },
                  { header: 'Posted On', value: (r) => r.created_at }
                ]}
                rows={noticeRows}
              />
            </div>
            {noticesLoading ? (
              <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
            ) : (
              <DataTable
                rows={noticeRows}
                rowKey={(row) => row.id}
                emptyMessage="No notices found."
                columns={[
                  { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
                  { key: 'audience', header: 'Audience', render: (row) => <span className="capitalize">{row.audience}</span> },
                  { key: 'posted_by_username', header: 'Posted By', render: (row) => row.posted_by_username || '—' },
                  { key: 'created_at', header: 'Posted On', sortable: true, sortValue: (row) => row.created_at, render: (row) => new Date(row.created_at).toLocaleDateString() }
                ]}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
