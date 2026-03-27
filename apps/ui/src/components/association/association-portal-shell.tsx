'use client';

import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError, getMyAssociations } from '@/lib/api';
import { type NavItem, PortalShell } from '@/components/portal-shell';

type AssociationPortalShellProps = {
  associationId: string;
  navItems: NavItem[];
  children: ReactNode;
};

export const AssociationPortalShell = ({
  associationId,
  navItems,
  children,
}: AssociationPortalShellProps) => {
  const associationsQuery = useQuery({
    queryKey: ['associations', 'shell'],
    queryFn: getMyAssociations,
  });

  const association = associationsQuery.data?.find((item) => item.id === associationId);
  const title = association?.name ?? 'Association portal';
  let subtitle = `Association ID: ${associationId}`;

  if (associationsQuery.isPending) {
    subtitle = `Loading association... · Association ID: ${associationId}`;
  } else if (associationsQuery.isError) {
    subtitle =
      associationsQuery.error instanceof ApiError
        ? `${associationsQuery.error.message} · Association ID: ${associationId}`
        : `Association ID: ${associationId}`;
  }

  return (
    <PortalShell
      role="Association"
      title={title}
      subtitle={subtitle}
      loginPath="/login/association"
      settingsPath={`/association/${associationId}/setup`}
      navItems={navItems}
    >
      {children}
    </PortalShell>
  );
};
