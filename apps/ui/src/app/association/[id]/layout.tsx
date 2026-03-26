import { type ReactNode } from 'react';

import { PortalShell } from '@/components/portal-shell';

type AssociationScopedLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function AssociationScopedLayout({
  children,
  params,
}: AssociationScopedLayoutProps) {
  const { id } = await params;
  const base = `/association/${id}`;

  const associationNav = [
    { label: 'Home', href: base, icon: 'home' as const },
    { label: 'Members', href: `${base}/members`, icon: 'members' as const },
    { label: 'Claims', href: `${base}/claims`, icon: 'claims' as const },
    { label: 'Wallet', href: `${base}/wallet`, icon: 'wallet' as const },
  ];

  return (
    <PortalShell
      role="Association"
      title="Association portal"
      subtitle={`Association ID: ${id}`}
      loginPath="/login/association"
      navItems={associationNav}
    >
      {children}
    </PortalShell>
  );
}
