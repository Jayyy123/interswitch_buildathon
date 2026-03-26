import { AssociationClaimDetail } from '@/components/association/association-claim-detail';

type ScopedClaimDetailPageProps = {
  params: Promise<{ id: string; claimId: string }>;
};

export default async function ScopedClaimDetailPage({ params }: ScopedClaimDetailPageProps) {
  const { id, claimId } = await params;

  return <AssociationClaimDetail associationId={id} claimId={claimId} />;
}
