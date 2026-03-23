import { PiggyBank, Target, WalletCards } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';

export default function AssociationWalletPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={WalletCards} label="Wallet Balance" value="N 4,920,000" />
        <StatCard icon={Target} label="Weekly Target" value="N 1,200,000" />
        <StatCard
          icon={PiggyBank}
          label="Collected This Week"
          value="N 890,000"
          hint="74% progress"
        />
      </section>
      <SectionCard
        icon={WalletCards}
        title="Wallet account details"
        description="Details needed for top-up and reconciliation."
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Bank</p>
            <p className="font-medium text-white">Interswitch Settlement Bank</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Account Number</p>
            <p className="font-medium text-white">0034567821</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Wallet ID</p>
            <p className="font-medium text-white">WLT-AH-3399</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Status</p>
            <p className="font-medium text-emerald-300">Active</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
