'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, UserRound, Wallet } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationMemberById } from '@/lib/api';
import { formatNgn } from '@/lib/claim-ui';

export default function ScopedMemberDetailPage() {
  const params = useParams<{ id: string; memberId: string }>();
  const id = params.id;
  const memberId = params.memberId;
  const memberQuery = useQuery({
    queryKey: ['association-member', id, memberId],
    queryFn: () => getAssociationMemberById(id, memberId),
  });
  const member = memberQuery.data;

  if (memberQuery.isPending) {
    return <p className="text-sm text-slate-400">Loading member details...</p>;
  }

  if (memberQuery.isError) {
    return (
      <SectionCard title="Could not load member" description="">
        <p className="text-sm text-rose-300">
          {memberQuery.error instanceof ApiError
            ? memberQuery.error.message
            : 'Could not load member details.'}
        </p>
      </SectionCard>
    );
  }

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
        title={member.name}
        description={`${member.id} · Joined ${new Date(member.enrolledAt).toLocaleDateString()}`}
        action={
          <StatusBadge
            label={member.status}
            tone={
              member.status === 'ACTIVE' ? 'green' : member.status === 'PAUSED' ? 'yellow' : 'red'
            }
          />
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm">
            <h4 className="font-semibold text-white">Profile details</h4>
            <p className="text-slate-300">Phone: {member.phone}</p>
            <p className="text-slate-300">BVN: {member.bvn}</p>
            <p className="text-slate-300">
              Coverage used this year: {formatNgn(member.coverageUsedThisYear)}
            </p>
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
            <p className="text-slate-300">Wallet ID: {member.walletId ?? '-'}</p>
            <p className="text-slate-300">Account Number: {member.walletAccountNumber ?? '-'}</p>
            <p className="text-slate-300">Wallet status: {member.walletStatus}</p>
            <p className="text-emerald-300">
              Balance: {formatNgn(member.bankAccount?.balance ?? 0)}
            </p>
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
              key={item.id}
              className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
            >
              <span className="text-slate-300">{new Date(item.week).toLocaleDateString()}</span>
              <span className="text-white">{formatNgn(item.amount)}</span>
              <StatusBadge
                label={item.status.toLowerCase()}
                tone={
                  item.status === 'SUCCESS' ? 'green' : item.status === 'PENDING' ? 'yellow' : 'red'
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
