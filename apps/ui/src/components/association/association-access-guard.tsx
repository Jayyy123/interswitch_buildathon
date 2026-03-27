'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/auth-context';
import { getMyAssociations } from '@/lib/api';

type Props = {
  associationId: string;
  children: React.ReactNode;
};

export const AssociationAccessGuard = ({ associationId, children }: Props) => {
  const router = useRouter();
  const { user } = useAuth();
  const associationsQuery = useQuery({
    queryKey: ['associations', user?.id ?? 'anonymous'],
    queryFn: getMyAssociations,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!associationsQuery.data) return;
    const hasAccess = associationsQuery.data.some(
      (association) => association.id === associationId,
    );
    if (!hasAccess) {
      router.replace('/not-found');
    }
  }, [associationsQuery.data, associationId, router]);

  if (associationsQuery.isPending) {
    return <p className="text-sm text-slate-400">Checking association access...</p>;
  }

  if (!associationsQuery.data) {
    return null;
  }

  const hasAccess = associationsQuery.data.some((association) => association.id === associationId);
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};
