import { ArrowLeftRight } from 'lucide-react';

import { TransactionsManagementTable } from '@/components/association/transactions-management-table';
import { SectionCard } from '@/components/section-card';

const AssociationTransactionsPage = () => {
  return (
    <SectionCard
      icon={ArrowLeftRight}
      title="Transactions"
      description="Weekly contributions and manual cash records."
    >
      <TransactionsManagementTable />
    </SectionCard>
  );
};

export default AssociationTransactionsPage;
