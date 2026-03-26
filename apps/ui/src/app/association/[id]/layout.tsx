import { type ReactNode } from 'react';

import { AssociationAccessGuard } from '@/components/association/association-access-guard';
import { PortalShell } from '@/components/portal-shell';

type AssociationScopedLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

const AssociationScopedLayout = async ({ children, params }: AssociationScopedLayoutProps) => {
  const { id } = await params;
  const base = `/association/${id}`;

  const associationNav = [
    { label: 'Home', href: base, icon: 'home' as const },
    { label: 'Members', href: `${base}/members`, icon: 'members' as const },
    { label: 'Claims', href: `${base}/claims`, icon: 'claims' as const },
    { label: 'Wallet', href: `${base}/wallet`, icon: 'wallet' as const },
  ];

  return (
    <AssociationAccessGuard associationId={id}>
      <PortalShell
        role="Association"
        title="Association portal"
        subtitle={`Association ID: ${id}`}
        loginPath="/login/association"
        navItems={associationNav}
      >
        {children}
      </PortalShell>
    </AssociationAccessGuard>
  );
};

export default AssociationScopedLayout;
