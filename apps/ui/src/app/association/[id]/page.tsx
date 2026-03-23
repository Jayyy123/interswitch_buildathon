import Link from 'next/link';
import { Activity, Clock3, HandCoins, Users2, Wallet } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type AssociationDashboardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssociationDashboardPage({ params }: AssociationDashboardPageProps) {
  const { id } = await params;
  const base = `/association/${id}`;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Pool Balance"
          value="N 4,920,000"
          hint="Updated 2 mins ago"
        />
        <StatCard icon={Users2} label="Active Members" value="187" hint="12 paused" />
        <StatCard icon={HandCoins} label="Total Paid Out" value="N 1,140,500" hint="This year" />
        <StatCard icon={Clock3} label="Next Debit Run" value="2 days" hint="Every Friday" />
      </section>

      <SectionCard
        icon={Activity}
        title="Quick actions"
        description="Fast paths for daily operations."
        action={
          <Link
            href={`${base}/setup`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Setup
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={`${base}/members`}
            className={buttonVariants({ className: 'justify-center' })}
          >
            Enroll / Manage Members
          </Link>
          <Link
            href={`${base}/claims`}
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            Review Claims
          </Link>
          <Link
            href={`${base}/transactions`}
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            See Transactions
          </Link>
          <Link
            href={`${base}/wallet`}
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            Wallet Details
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        icon={HandCoins}
        title="Recent claims"
        description="Pending approvals need your attention first."
        action={
          <Link
            href={`${base}/claims`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            See all
          </Link>
        }
      >
        <div className="space-y-3 text-sm">
          {[
            ['CLM-1822', 'Kemi Adesina', 'N 90,000', 'pending'],
            ['CLM-1821', 'Ifeoma Nwosu', 'N 40,000', 'approved'],
            ['CLM-1816', 'Segun Musa', 'N 15,000', 'paid'],
          ].map(([id, name, amount, status]) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 p-3"
            >
              <div>
                <p className="font-medium text-white">{name}</p>
                <p className="text-xs text-slate-400">
                  {id} · {amount}
                </p>
              </div>
              <StatusBadge
                label={status}
                tone={status === 'pending' ? 'yellow' : status === 'paid' ? 'green' : 'blue'}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
