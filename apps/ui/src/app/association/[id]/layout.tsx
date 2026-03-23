import { type ReactNode } from 'react';
import { CreditCard, HandCoins, House, Users } from 'lucide-react';
import { notFound } from 'next/navigation';

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
  if (id !== 'assoc-001') notFound();
  const base = `/association/${id}`;

  const associationNav = [
    { label: 'Home', href: base, icon: House },
    { label: 'Members', href: `${base}/members`, icon: Users },
    { label: 'Claims', href: `${base}/claims`, icon: HandCoins },
    { label: 'Wallet', href: `${base}/wallet`, icon: CreditCard },
  ];

  return (
    <PortalShell
      role="Association"
      title="Alausa Traders Association"
      subtitle={`Association ID: ${id} · Plan: Gold`}
      logoutHref="/login/association"
      navItems={associationNav}
    >
      {children}
    </PortalShell>
  );
}
