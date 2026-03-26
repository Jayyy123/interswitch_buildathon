import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { OnboardingSaveLink } from '@/components/auth/onboarding-save-link';
import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';

type AssociationSetupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssociationSetupPage({ params }: AssociationSetupPageProps) {
  const { id } = await params;

  return (
    <SectionCard
      icon={Building2}
      title="Association setup"
      description="Create and fund your association wallet."
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Association name</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="Alausa Traders Association"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">CAC number</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="RC-33012"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Weekly levy amount</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="6000"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Plan tier</span>
          <select
            defaultValue="Gold"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          >
            <option>Bronze</option>
            <option>Silver</option>
            <option>Gold</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Anniversary date</span>
          <input
            type="date"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="2026-07-10"
          />
        </label>
      </form>
      <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
        Initial pool funding uses Interswitch checkout in production.
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <OnboardingSaveLink
          href={`/association/${id}`}
          userId={id}
          role="IYALOJA"
          className={buttonVariants({ className: 'justify-center' })}
        >
          Save Setup
        </OnboardingSaveLink>
        <Link
          href={`/association/${id}/wallet`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          View Wallet
        </Link>
      </div>
    </SectionCard>
  );
}
