import Link from 'next/link';
import { ArrowLeft, UserRound, Wallet } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { MEMBERS } from '@/data/members';

type ScopedMemberDetailPageProps = {
  params: Promise<{ id: string; memberId: string }>;
};

export default async function ScopedMemberDetailPage({ params }: ScopedMemberDetailPageProps) {
  const { id, memberId } = await params;
  const member = MEMBERS.find((item) => item.id === memberId);

  if (!member) {
    return (
      <SectionCard title="Member not found" description={`No member matched ID ${memberId}.`}>
        <Link
          href={`/association/${id}/members`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          <ArrowLeft className="size-4" />
          Back to members
        </Link>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/association/${id}`} className="hover:text-slate-200">
              Association
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/association/${id}/members`} className="hover:text-slate-200">
              Members
            </Link>
          </li>
          <li>/</li>
          <li className="text-slate-200">{member.id}</li>
        </ol>
      </nav>

      <Link
        href={`/association/${id}/members`}
        className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
      >
        <ArrowLeft className="size-4" />
        Back to members
      </Link>

      <SectionCard
        icon={UserRound}
        title={member.fullName}
        description={`${member.id} · Joined ${member.joinedAt}`}
        action={
          <StatusBadge
            label={member.status}
            tone={
              member.status === 'active' ? 'green' : member.status === 'paused' ? 'yellow' : 'red'
            }
          />
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm">
            <h4 className="font-semibold text-white">Profile details</h4>
            <p className="text-slate-300">Phone: {member.phone}</p>
            <p className="text-slate-300">BVN: {member.bvn}</p>
            <p className="text-slate-300">Payment method: {member.paymentMethod}</p>
            <p className="text-slate-300">Coverage used this year: {member.coverageUsedThisYear}</p>
            <p className="text-slate-300">
              Consecutive missed payments: {member.consecutiveMissedPayments}
            </p>
            <p className="text-slate-300">Contribution streak: {member.contributionStreak}</p>
          </div>

          <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm">
            <h4 className="inline-flex items-center gap-2 font-semibold text-white">
              <Wallet className="size-4 text-emerald-300" />
              Wallet details
            </h4>
            <p className="text-slate-300">Wallet ID: {member.walletId}</p>
            <p className="text-slate-300">Account Number: {member.walletAccountNumber}</p>
            <p className="text-slate-300">Bank Code: {member.bankCode}</p>
            <p className="text-emerald-300">Balance: {member.walletBalance}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Recent contributions"
        description="Most recent contribution records for this member."
      >
        <div className="space-y-2">
          {member.recentContributions.map((item) => (
            <div
              key={`${member.id}-${item.week}`}
              className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
            >
              <span className="text-slate-300">{item.week}</span>
              <span className="text-white">{item.amount}</span>
              <StatusBadge
                label={item.status}
                tone={item.status === 'success' ? 'green' : item.status === 'cash' ? 'blue' : 'red'}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
