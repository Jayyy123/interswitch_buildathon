import { type ReactNode } from 'react';
import { ClipboardPlus, FileClock, House, Settings } from 'lucide-react';
import { notFound } from 'next/navigation';

import { PortalShell } from '@/components/portal-shell';

type ClinicScopedLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ClinicScopedLayout({ children, params }: ClinicScopedLayoutProps) {
  const { id } = await params;
  if (id !== 'clinic-001') notFound();
  const base = `/clinic/${id}`;

  const clinicNav = [
    { label: 'Home', href: base, icon: House },
    { label: 'New Claim', href: `${base}/claims/new`, icon: ClipboardPlus },
    { label: 'Claims', href: `${base}/claims`, icon: FileClock },
    { label: 'Setup', href: `${base}/setup`, icon: Settings },
  ];

  return (
    <PortalShell
      role="Clinic"
      title="HealthPoint Clinic"
      subtitle={`Clinic ID: ${id} · Fast member lookup enabled`}
      logoutHref="/login/clinic"
      navItems={clinicNav}
    >
      {children}
    </PortalShell>
  );
}
