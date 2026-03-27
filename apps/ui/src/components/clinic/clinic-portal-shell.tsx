'use client';

import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError, getClinicSetup } from '@/lib/api';
import { type NavItem, PortalShell } from '@/components/portal-shell';

type ClinicPortalShellProps = {
  clinicId: string;
  navItems: NavItem[];
  children: ReactNode;
};

export const ClinicPortalShell = ({ clinicId, navItems, children }: ClinicPortalShellProps) => {
  const setupQuery = useQuery({
    queryKey: ['clinic-setup', 'shell'],
    queryFn: getClinicSetup,
  });

  const clinicName = setupQuery.data?.name?.trim();
  const title = clinicName || 'Clinic portal';
  let subtitle = `Clinic ID: ${clinicId} · Fast member lookup enabled`;

  if (setupQuery.isPending) {
    subtitle = `Loading clinic... · Clinic ID: ${clinicId}`;
  } else if (setupQuery.isError) {
    subtitle =
      setupQuery.error instanceof ApiError
        ? `${setupQuery.error.message} · Clinic ID: ${clinicId}`
        : `Clinic ID: ${clinicId} · Fast member lookup enabled`;
  }

  return (
    <PortalShell
      role="Clinic"
      title={title}
      subtitle={subtitle}
      loginPath="/login/clinic"
      settingsPath={`/clinic/${clinicId}/setup`}
      navItems={navItems}
    >
      {children}
    </PortalShell>
  );
};
