'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import {
  Building2,
  ClipboardPlus,
  CreditCard,
  FileClock,
  HandCoins,
  HeartPulse,
  House,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: 'home' | 'members' | 'claims' | 'wallet' | 'new-claim' | 'setup';
};

type PortalShellProps = {
  role: 'Association' | 'Clinic';
  title: string;
  subtitle?: string;
  loginPath: string;
  navItems: NavItem[];
  children: ReactNode;
};

export const PortalShell = ({
  role,
  title,
  subtitle,
  loginPath,
  navItems,
  children,
}: PortalShellProps) => {
  const router = useRouter();
  const { logout } = useAuth();
  const roleIcon = role === 'Association' ? Building2 : HeartPulse;
  const RoleIcon = roleIcon;

  const handleLogout = () => {
    logout();
    router.push(loginPath);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-36 pt-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 p-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300">
                <RoleIcon className="size-3.5" />
                {role} Portal
              </p>
              <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className:
                  'justify-center border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
              })}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </header>
        <main className="space-y-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 bg-transparent px-4 py-4">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-[0_-8px_28px_rgba(2,6,23,0.55)] backdrop-blur">
          {navItems.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ item }: { item: NavItem }) => {
  const iconMap = {
    home: House,
    members: Users,
    claims: HandCoins,
    wallet: CreditCard,
    'new-claim': ClipboardPlus,
    setup: Settings,
  } as const;
  const Icon =
    item.icon === 'claims' && item.href.startsWith('/clinic/') ? FileClock : iconMap[item.icon];

  return (
    <Link
      href={item.href}
      className={cn(
        'flex min-h-16 flex-col items-center justify-center rounded-xl px-2 py-3 text-center text-xs font-medium text-slate-300 transition',
        'bg-white/3 hover:-translate-y-0.5 hover:bg-emerald-400/18 hover:text-white',
      )}
    >
      <Icon className="mb-1 size-4" />
      {item.label}
    </Link>
  );
};
