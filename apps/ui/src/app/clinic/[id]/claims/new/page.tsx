'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClipboardPlus } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, lookupMember, submitClinicClaim, type MemberLookupResult } from '@/lib/api';
import { formatNgn } from '@/lib/claim-ui';

export default function NewClinicClaimPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [member, setMember] = useState<MemberLookupResult | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const [billAmount, setBillAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    message: string;
    approvedAmount: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState('');

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  const handleLookup = async () => {
    if (!phone.trim()) return;
    setLookingUp(true);
    setMember(null);
    setLookupError('');
    try {
      const data = await lookupMember(phone.trim());
      setMember(data);
    } catch (err) {
      setLookupError(
        err instanceof ApiError ? err.message : 'Member not found. Check the phone number.',
      );
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Enter a valid bill amount.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await submitClinicClaim({
        memberId: member.memberId,
        associationId: member.associationId,
        billAmount: amount,
        description: description.trim() || undefined,
      });
      setResult({ status: res.status, message: res.message, approvedAmount: res.approvedAmount });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusTone = (s: MemberLookupResult['status']) => {
    if (s === 'ACTIVE') return 'green' as const;
    if (s === 'PAUSED') return 'yellow' as const;
    return 'red' as const;
  };

  if (result) {
    return (
      <SectionCard icon={ClipboardPlus} title="Claim submitted" description={result.message}>
        <div className="space-y-3 text-sm">
          <p>
            Status:{' '}
            <StatusBadge
              label={result.status}
              tone={
                result.status === 'PAID' ? 'green' : result.status === 'FAILED' ? 'red' : 'yellow'
              }
            />
          </p>
          <p className="text-slate-300">
            Approved amount:{' '}
            <span className="font-semibold text-white">{formatNgn(result.approvedAmount)}</span>
          </p>
          <div className="flex gap-2 pt-2">
            <button
              id="new-claim-btn"
              type="button"
              className={buttonVariants({ variant: 'outline' })}
              onClick={() => {
                setResult(null);
                setMember(null);
                setPhone('');
                setBillAmount('');
                setDescription('');
              }}
            >
              New claim
            </button>
            <button
              id="view-claims-btn"
              type="button"
              className={buttonVariants({ className: 'justify-center' })}
              onClick={() => router.push(`/clinic/${params.id}/claims`)}
            >
              View all claims
            </button>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={ClipboardPlus}
      title="New claim request"
      description="Verify a patient first, then submit their treatment bill."
    >
      {/* Step 1: Member lookup */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Step 1 — Verify patient
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            id="claim-phone-input"
            ref={phoneRef}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Patient phone (08012345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleLookup();
            }}
          />
          <button
            id="lookup-btn"
            type="button"
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
            disabled={!phone.trim() || lookingUp}
            onClick={handleLookup}
          >
            {lookingUp ? 'Searching…' : 'Find member'}
          </button>
        </div>
        {lookupError && <p className="text-sm text-rose-300">{lookupError}</p>}
        {member && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge
                label={member.status === 'ACTIVE' ? 'COVERED' : member.status}
                tone={statusTone(member.status)}
              />
              <span className="font-medium text-white">{member.name ?? member.phone}</span>
            </div>
            <p className="mt-1 text-slate-300">
              {member.association} &middot; {member.plan} plan &middot; Remaining:{' '}
              <span className="font-semibold text-emerald-300">
                {formatNgn(member.coverageRemaining)}
              </span>
            </p>
            {member.status !== 'ACTIVE' && (
              <p className="mt-1 text-rose-300">
                ⚠ Coverage is {member.status.toLowerCase()} — claims cannot be submitted.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Bill details */}
      {member?.status === 'ACTIVE' && (
        <form id="new-claim-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Step 2 — Bill details
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Bill amount (₦)</span>
              <input
                id="bill-amount-input"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                placeholder="e.g. 45000"
                type="number"
                min={1}
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Description (optional)</span>
              <input
                id="description-input"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                placeholder="e.g. Outpatient consultation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {billAmount && member && (
            <p className="text-xs text-slate-400">
              Approved amount will be capped at{' '}
              <span className="text-emerald-300">
                {formatNgn(Math.min(parseFloat(billAmount) || 0, member.coverageRemaining))}
              </span>{' '}
              (member&apos;s remaining coverage).
            </p>
          )}

          {submitError && <p className="text-sm text-rose-300">{submitError}</p>}

          <button
            id="submit-claim-btn"
            type="submit"
            className={buttonVariants({ className: 'justify-center' })}
            disabled={submitting || !billAmount}
          >
            {submitting ? 'Submitting…' : 'Submit & pay clinic'}
          </button>
        </form>
      )}
    </SectionCard>
  );
}
