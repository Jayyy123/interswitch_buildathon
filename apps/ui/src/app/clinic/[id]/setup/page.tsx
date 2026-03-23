import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';

type ClinicSetupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClinicSetupPage({ params }: ClinicSetupPageProps) {
  const { id } = await params;

  return (
    <SectionCard
      icon={Building2}
      title="Clinic setup"
      description="Create your clinic profile and payout destination."
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Clinic name</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="HealthPoint Clinic"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Address</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="12 Medical Avenue, Ikeja"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Phone</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="+234 809 222 1100"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Bank code</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="011"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Account number</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="0099553344"
          />
        </label>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/clinic/${id}`} className={buttonVariants({ className: 'justify-center' })}>
          Save clinic
        </Link>
      </div>
    </SectionCard>
  );
}
