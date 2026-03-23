import Link from 'next/link';
import { HandCoins } from 'lucide-react';

import { ClaimsManagementTable } from '@/components/association/claims-management-table';
import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';

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
      action={
        <Link
          href={`/association/${id}/claims/CLM-1822`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Open latest
        </Link>
      }
    >
      <ClaimsManagementTable associationId={id} />
    </SectionCard>
  );
}
