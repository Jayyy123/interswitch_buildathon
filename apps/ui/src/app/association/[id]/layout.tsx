import { type ReactNode } from 'react';

import { AssociationAccessGuard } from '@/components/association/association-access-guard';
import { AssociationPortalShell } from '@/components/association/association-portal-shell';

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
      <AssociationPortalShell associationId={id} navItems={associationNav}>
        {children}
      </AssociationPortalShell>
    </AssociationAccessGuard>
  );
};

export default AssociationScopedLayout;
