import { FileImage, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type ScopedClaimDetailPageProps = {
  params: Promise<{ id: string; claimId: string }>;
};

export default async function ScopedClaimDetailPage({ params }: ScopedClaimDetailPageProps) {
  const { id, claimId } = await params;

  return (
    <div className="space-y-6">
      <SectionCard
        icon={ShieldCheck}
        title={`Claim ${claimId}`}
        description="Clinic-submitted request for member treatment bill."
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Member</p>
            <p className="font-medium text-white">Kemi Adesina · MEM-001</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Clinic</p>
            <p className="font-medium text-white">HealthPoint Clinic</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Bill amount</p>
            <p className="font-medium text-white">N 90,000</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Status</p>
            <StatusBadge label="pending" tone="yellow" />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FileImage} title="Bill evidence" description="Supporting bill image.">
        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center text-sm text-slate-300">
          No bill image uploaded yet.
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonVariants({ className: 'justify-center' })}>
          Approve claim
        </button>
        <button
          type="button"
          className={buttonVariants({ variant: 'destructive', className: 'justify-center' })}
        >
          Decline claim
        </button>
        <Link
          href={`/association/${id}/claims`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          Back to claims
        </Link>
      </div>
    </div>
  );
}
