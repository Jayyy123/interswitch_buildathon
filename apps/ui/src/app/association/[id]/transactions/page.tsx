import { ArrowLeftRight } from 'lucide-react';

import { TransactionsManagementTable } from '@/components/association/transactions-management-table';
import { SectionCard } from '@/components/section-card';

type AssociationTransactionsPageProps = {
  params: Promise<{ id: string }>;
};

const AssociationTransactionsPage = async ({ params }: AssociationTransactionsPageProps) => {
  const { id } = await params;
  return (
    <SectionCard
      icon={ArrowLeftRight}
      title="Transactions"
      description="Weekly contributions and manual cash records."
    >
      <TransactionsManagementTable associationId={id} />
    </SectionCard>
  );
};

export default AssociationTransactionsPage;
