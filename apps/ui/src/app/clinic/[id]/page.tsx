'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BadgeCheck, CircleDollarSign, FileClock, SearchCheck } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClinicStats, lookupMember, type MemberLookupResult } from '@/lib/api';
import { formatNgn } from '@/lib/claim-ui';

type ClinicDashboardPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClinicDashboardPage({ params: _params }: ClinicDashboardPageProps) {
  const [phone, setPhone] = useState('');
  const [queryPhone, setQueryPhone] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ['clinic-stats'],
    queryFn: getClinicStats,
  });

  const lookupQuery = useQuery<MemberLookupResult>({
    queryKey: ['member-lookup', queryPhone],
    queryFn: () => lookupMember(queryPhone!),
    enabled: !!queryPhone,
    retry: false,
  });

  const stats = statsQuery.data;

  const statusTone = (s: MemberLookupResult['status']) => {
    if (s === 'ACTIVE') return 'green' as const;
    if (s === 'PAUSED') return 'yellow' as const;
    return 'red' as const;
  };

  const statusLabel = (s: MemberLookupResult['status']) => {
    if (s === 'ACTIVE') return 'COVERED';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'FLAGGED') return 'FLAGGED';
    return 'INCOMPLETE';
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={FileClock}
          label="Pending Claims"
          value={statsQuery.isPending ? '…' : String(stats?.pending ?? 0)}
        />
        <StatCard
          icon={BadgeCheck}
          label="Paid Claims"
          value={statsQuery.isPending ? '…' : String(stats?.paid ?? 0)}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Paid Out to Clinic"
          value={statsQuery.isPending ? '…' : formatNgn(stats?.totalPaidOut ?? 0)}
        />
      </section>

      <SectionCard
        icon={SearchCheck}
        title="Member verification"
        description="Lookup by patient phone number before submitting a claim."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            id="member-phone-input"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Enter patient phone (e.g. 08012345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && phone.trim()) setQueryPhone(phone.trim());
            }}
          />
          <button
            id="verify-member-btn"
            type="button"
            className={buttonVariants({ className: 'justify-center' })}
            disabled={!phone.trim() || lookupQuery.isFetching}
            onClick={() => setQueryPhone(phone.trim())}
          >
            {lookupQuery.isFetching ? 'Searching…' : 'Verify'}
          </button>
        </div>

        {lookupQuery.isError && (
          <p className="mt-3 text-sm text-rose-300">
            {lookupQuery.error instanceof ApiError
              ? lookupQuery.error.message
              : 'Member not found.'}
          </p>
        )}

        {lookupQuery.data && (
          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge
                label={statusLabel(lookupQuery.data.status)}
                tone={statusTone(lookupQuery.data.status)}
              />
              <span className="font-medium text-white">
                {lookupQuery.data.name ?? lookupQuery.data.phone}
              </span>
            </div>
            <p className="text-slate-300">
              Association: <span className="text-white">{lookupQuery.data.association}</span>{' '}
              &middot; Plan: <span className="text-white">{lookupQuery.data.plan}</span>
            </p>
            <p className="text-slate-300">
              Remaining coverage:{' '}
              <span className="font-semibold text-emerald-300">
                {formatNgn(lookupQuery.data.coverageRemaining)}
              </span>{' '}
              of {formatNgn(lookupQuery.data.coverageLimit)}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={FileClock}
        title="Create claim request"
        description="Payment goes directly to clinic account after submission."
      >
        <Link
          id="new-claim-link"
          href={`/clinic/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : ''}/claims/new`}
          className={buttonVariants({ className: 'justify-center' })}
        >
          New claim
        </Link>
      </SectionCard>
    </div>
  );
}
