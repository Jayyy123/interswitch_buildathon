import { FileClock } from 'lucide-react';

import { ClinicClaimsManagementTable } from '@/components/clinic/claims-management-table';
import { SectionCard } from '@/components/section-card';

const ClinicClaimsPage = () => {
  return (
    <SectionCard
      icon={FileClock}
      title="Clinic claim requests"
      description="Track pending, approved and rejected requests."
    >
      <ClinicClaimsManagementTable />
    </SectionCard>
  );
};

export default ClinicClaimsPage;
