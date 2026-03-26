'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileImage, FileText, ShieldCheck } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClaimById } from '@/lib/api';
import type { ClaimDetail } from '@/lib/auth-types';
import { claimStatusLabel, claimStatusTone, formatNgn } from '@/lib/claim-ui';

type Props = {
  associationId: string;
  claimId: string;
};

export const AssociationClaimDetail = ({ associationId, claimId }: Props) => {
  const claimQuery = useQuery<ClaimDetail, ApiError>({
    queryKey: ['claim-detail', claimId],
    queryFn: async () => {
      const claim = await getClaimById(claimId);
      return claim;
    },
  });

  if (claimQuery.isPending) {
    return <p className="text-sm text-slate-400">Loading claim…</p>;
  }

  if (claimQuery.isError) {
    return (
      <div className="space-y-4">
        <p className="text-rose-300">{claimQuery.error.message}</p>
        <Link
          href={`/association/${associationId}/claims`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          Back to claims
        </Link>
      </div>
    );
  }

  const claim = claimQuery.data;
  if (!claim) return null;

  const memberLabel = claim.member.userId
    ? `Member ${claim.member.id.slice(0, 8)}… (linked)`
    : `Member ${claim.member.id.slice(0, 8)}…`;

  return (
    <div className="space-y-6">
      <SectionCard
        icon={ShieldCheck}
        title={`Claim ${claim.id.slice(0, 8)}…`}
        description="Clinic-submitted request for member treatment bill."
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Member</p>
            <p className="font-medium text-white">{memberLabel}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Association</p>
            <p className="font-medium text-white">{claim.association.name}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Hospital</p>
            <p className="font-medium text-white">{claim.hospitalName}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Bill amount</p>
            <p className="font-medium text-white">{formatNgn(claim.billAmount)}</p>
          </div>
          {claim.approvedAmount != null ? (
            <div className="rounded-lg border border-white/10 bg-black/10 p-3">
              <p className="text-slate-400">Approved amount</p>
              <p className="font-medium text-white">{formatNgn(claim.approvedAmount)}</p>
            </div>
          ) : null}
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Status</p>
            <StatusBadge
              label={claimStatusLabel(claim.status)}
              tone={claimStatusTone(claim.status)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FileImage} title="Bill evidence" description="Supporting bill image.">
        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-8 text-center text-sm text-slate-300">
          {claim.billPhotoUrl ? (
            <a
              href={claim.billPhotoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline-offset-4 hover:underline"
            >
              View uploaded bill
            </a>
          ) : (
            'No bill image uploaded yet.'
          )}
        </div>
      </SectionCard>

      {claim.description ? (
        <SectionCard icon={FileText} title="Notes" description="">
          <p className="text-sm text-slate-300">{claim.description}</p>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled className={buttonVariants({ className: 'justify-center' })}>
          Approve claim
        </button>
        <button
          type="button"
          disabled
          className={buttonVariants({ variant: 'destructive', className: 'justify-center' })}
        >
          Decline claim
        </button>
        <Link
          href={`/association/${associationId}/claims`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          Back to claims
        </Link>
      </div>
    </div>
  );
};
