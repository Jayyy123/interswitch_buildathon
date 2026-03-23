import { ClipboardPlus } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';

export default function NewClinicClaimPage() {
  return (
    <SectionCard
      icon={ClipboardPlus}
      title="New claim request"
      description="Submit treatment bill against a member ID."
    >
      <form id="new-claim-form" className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Member ID</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            placeholder="MEM-001"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Association</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="Alausa Traders Association"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Hospital name</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="HealthPoint Clinic"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Hospital account number</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="0099553344"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Bank code</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="011"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Bill amount</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            defaultValue="90000"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Claim type</span>
          <select className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2">
            <option>Outpatient</option>
            <option>Major</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Bill photo</span>
          <input
            type="file"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
          />
        </label>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          form="new-claim-form"
          className={buttonVariants({ className: 'justify-center' })}
        >
          Submit claim
        </button>
      </div>
    </SectionCard>
  );
}
