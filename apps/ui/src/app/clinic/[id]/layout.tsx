import { type ReactNode } from 'react';

import { ClinicPortalShell } from '@/components/clinic/clinic-portal-shell';

type ClinicScopedLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ClinicScopedLayout({ children, params }: ClinicScopedLayoutProps) {
  const { id } = await params;
  const base = `/clinic/${id}`;

  const clinicNav = [
    { label: 'Home', href: base, icon: 'home' as const },
    { label: 'New Claim', href: `${base}/claims/new`, icon: 'new-claim' as const },
    { label: 'Claims', href: `${base}/claims`, icon: 'claims' as const },
    { label: 'Setup', href: `${base}/setup`, icon: 'setup' as const },
  ];

  return (
    <ClinicPortalShell clinicId={id} navItems={clinicNav}>
      {children}
    </ClinicPortalShell>
  );
}
