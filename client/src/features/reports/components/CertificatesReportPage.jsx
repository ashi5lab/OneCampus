import { PageHeader } from '../../../components/PageHeader';
import { CertificatesTab } from './CertificatesTab';

export function CertificatesReportPage() {
  return (
    <div>
      <PageHeader eyebrow="Reports · Insights" title="Certificates" />
      <CertificatesTab />
    </div>
  );
}
