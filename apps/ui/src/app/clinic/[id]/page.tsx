import Link from 'next/link';
import { BadgeCheck, CircleDollarSign, FileClock, SearchCheck } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type ClinicDashboardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClinicDashboardPage({ params }: ClinicDashboardPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={FileClock} label="Pending Claims" value="12" />
        <StatCard icon={BadgeCheck} label="Approved Claims" value="34" />
        <StatCard icon={CircleDollarSign} label="Paid Out to Clinic" value="N 2,140,000" />
      </section>

      <SectionCard
        icon={SearchCheck}
        title="Member verification"
        description="Lookup by member ID before treatment request."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Enter member ID (e.g., MEM-001)"
          />
          <button type="button" className={buttonVariants({ className: 'justify-center' })}>
            Verify
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <StatusBadge label="COVERED" tone="green" />
          <span className="text-slate-300">Remaining yearly coverage: N 210,000</span>
        </div>
      </SectionCard>

      <SectionCard
        icon={FileClock}
        title="Create claim request"
        description="Money goes directly to clinic account after approval."
      >
        <Link
          href={`/clinic/${id}/claims/new`}
          className={buttonVariants({ className: 'justify-center' })}
        >
          New claim
        </Link>
      </SectionCard>
    </div>
  );
}
