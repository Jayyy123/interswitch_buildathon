import { HandCoins } from 'lucide-react';

import { ClaimsManagementTable } from '@/components/association/claims-management-table';
import { SectionCard } from '@/components/section-card';

type AssociationClaimsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssociationClaimsPage({ params }: AssociationClaimsPageProps) {
  const { id } = await params;

  return (
    <SectionCard
      icon={HandCoins}
      title="Claims list"
      description="Review, approve, decline and track all requests."
    >
      <ClaimsManagementTable associationId={id} />
    </SectionCard>
  );
}
