import { PageHeader } from '../../../components/PageHeader';
import { LibraryTab } from './LibraryTab';

export function LibraryReportPage() {
  return (
    <div>
      <PageHeader eyebrow="Reports · Insights" title="Library" />
      <LibraryTab />
    </div>
  );
}
