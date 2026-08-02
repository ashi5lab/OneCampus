import { Library as LibraryIcon, Footprints, Award, BookMarked } from 'lucide-react';
import { useAnalyticsReport, useOverviewReport } from '../hooks/useReports';
import { LibraryTab } from './LibraryTab';
import { CertificatesTab } from './CertificatesTab';
import { PILLAR, tint } from '../lib/insightsTheme';

const LIBRARY = PILLAR.library;
const CERTIFICATES = PILLAR.certificates;

function OpsChip({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(color, 16), color }}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-ink-900">{value}</div>
        <div className="truncate text-[11.5px] text-ink-500">{label}</div>
      </div>
    </div>
  );
}

function SubHeading({ title, color }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-2 first:mt-0">
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
    </div>
  );
}

// Library circulation + certificates issuance, each with their full
// existing detail table (LibraryTab/CertificatesTab) embedded directly —
// previously these only got a link out; now they're actually on the page.
export function InsightsLibraryTab() {
  const { data: overview } = useOverviewReport();
  const { data: analytics } = useAnalyticsReport();

  return (
    <div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <OpsChip icon={LibraryIcon} label="Titles in Catalog" value={overview?.libraryTotalTitles ?? '—'} color={LIBRARY} />
        <OpsChip icon={Footprints} label="Overdue Loans" value={overview?.libraryOverdueLoans ?? '—'} color={LIBRARY} />
        <OpsChip icon={BookMarked} label="Outstanding Fines" value={analytics?.outstandingLibraryFines ?? '—'} color={LIBRARY} />
        <OpsChip icon={Award} label="Certificates Issued" value={overview?.certificatesIssued ?? '—'} color={CERTIFICATES} />
      </div>

      <SubHeading title="Library Circulation" color={LIBRARY} />
      <LibraryTab />

      <SubHeading title="Certificates" color={CERTIFICATES} />
      <CertificatesTab />
    </div>
  );
}
