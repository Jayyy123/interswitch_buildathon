'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock3, HandCoins, Users2, Wallet } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationClaims, getAssociationDashboard } from '@/lib/api';
import { claimStatusLabel, claimStatusTone, formatNgn } from '@/lib/claim-ui';

export default function AssociationDashboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const base = `/association/${id}`;

  const dashboardQuery = useQuery({
    queryKey: ['association-dashboard', id],
    queryFn: () => getAssociationDashboard(id),
  });

  const claimsQuery = useQuery({
    queryKey: ['association-claims-preview', id],
    queryFn: () => getAssociationClaims(id, { limit: 3, page: 1 }),
  });

  const dashboard = dashboardQuery.data;
  const claims = claimsQuery.data?.data ?? [];
  const nextDebitLabel = dashboard?.nextDebitDate
    ? new Date(dashboard.nextDebitDate).toLocaleDateString()
    : '—';

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Pool Balance"
          value={dashboardQuery.isPending ? '…' : formatNgn(dashboard?.poolBalance ?? 0)}
          hint={dashboardQuery.isPending ? 'Loading...' : `Plan ${dashboard?.plan ?? '—'}`}
        />
        <StatCard
          icon={Users2}
          label="Active Members"
          value={dashboardQuery.isPending ? '…' : String(dashboard?.activeMemberCount ?? 0)}
          hint={
            dashboardQuery.isPending
              ? 'Loading...'
              : `${dashboard?.pausedMemberCount ?? 0} paused • ${dashboard?.flaggedMemberCount ?? 0} flagged`
          }
        />
        <StatCard
          icon={HandCoins}
          label="Total Paid Out"
          value={dashboardQuery.isPending ? '…' : formatNgn(dashboard?.totalPaidOut ?? 0)}
          hint="Approved + paid claims"
        />
        <StatCard
          icon={Clock3}
          label="Next Debit Run"
          value={nextDebitLabel}
          hint="07:00 WAT Monday"
        />
      </section>
      {dashboardQuery.isError ? (
        <p className="text-sm text-rose-300">
          {dashboardQuery.error instanceof ApiError
            ? dashboardQuery.error.message
            : 'Could not load association dashboard.'}
        </p>
      ) : null}

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
            className={buttonVariants({
              variant: 'outline',
              className: 'justify-center hover:bg-primary! hover:text-primary-foreground!',
            })}
          >
            Enroll / Manage Members
          </Link>
          <Link
            href={`${base}/claims`}
            className={buttonVariants({
              variant: 'outline',
              className: 'justify-center hover:bg-primary! hover:text-primary-foreground!',
            })}
          >
            Review Claims
          </Link>
          <Link
            href={`${base}/transactions`}
            className={buttonVariants({
              variant: 'outline',
              className: 'justify-center hover:bg-primary! hover:text-primary-foreground!',
            })}
          >
            See Transactions
          </Link>
          <Link
            href={`${base}/wallet`}
            className={buttonVariants({
              variant: 'outline',
              className: 'justify-center hover:bg-primary! hover:text-primary-foreground!',
            })}
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
          {claimsQuery.isPending ? <p className="text-slate-400">Loading claims...</p> : null}
          {claimsQuery.isError ? (
            <p className="text-rose-300">
              {claimsQuery.error instanceof ApiError
                ? claimsQuery.error.message
                : 'Could not load recent claims.'}
            </p>
          ) : null}
          {!claimsQuery.isPending && claims.length === 0 ? (
            <p className="text-slate-400">No claims yet.</p>
          ) : null}
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 p-3"
            >
              <div>
                <p className="font-medium text-white">{claim.member.name}</p>
                <p className="text-xs text-slate-400">
                  {claim.id.slice(0, 8)}... · {formatNgn(claim.billAmount)}
                </p>
              </div>
              <StatusBadge
                label={claimStatusLabel(claim.status)}
                tone={claimStatusTone(claim.status)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
