import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { TodayTab } from './TodayTab';

// Reports landing page — shows Today's snapshot inline (the one report
// that's genuinely a "check every day" dashboard) and links out to the
// other sections as their own routed pages instead of nested tabs. Date
// Range, Academics, Attendance and Insights (formerly "More") each used
// to be a same-page tab whose content replaced Today's — now they're real
// navigation, matching Academics/Attendance's own sub-tabs (which stay as
// tabs since they're switching between views *within* one report, not
// between entirely different reports).
const SECTIONS = [
  { to: '/app/reports/date-range', label: 'Date Range' },
  { to: '/app/reports/academics', label: 'Academics' },
  { to: '/app/reports/attendance', label: 'Attendance' },
  { to: '/app/reports/more', label: 'Insights' }
];

export function ReportsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        tabs={
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-ink-900 px-3.5 py-1.5 text-xs font-semibold text-white">Today</button>
            {SECTIONS.map((s) => (
              <button
                key={s.to}
                onClick={() => navigate(s.to)}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      <TodayTab />
    </div>
  );
}
