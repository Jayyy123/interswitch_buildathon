'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getMyAssociations, updateAssociation } from '@/lib/api';
import { formatNgn, PLAN_WEEKLY_CONTRIBUTION } from '@/lib/claim-ui';

export default function AssociationSetupPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [plan, setPlan] = useState<'BRONZE' | 'SILVER' | 'GOLD'>('GOLD');
  const [coverageLimit, setCoverageLimit] = useState('');
  const [message, setMessage] = useState('');

  const associationsQuery = useQuery({
    queryKey: ['associations', 'setup'],
    queryFn: getMyAssociations,
  });

  useEffect(() => {
    const association = associationsQuery.data?.find((item) => item.id === id);
    if (!association) return;
    setName(association.name ?? '');
    setCacNumber(association.cacNumber ?? '');
    setPlan((association.plan ?? 'GOLD') as 'BRONZE' | 'SILVER' | 'GOLD');
    setCoverageLimit(
      typeof association.coverageLimit === 'number' ? String(association.coverageLimit) : '',
    );
  }, [associationsQuery.data, id]);

  const mutation = useMutation({
    mutationFn: () =>
      updateAssociation(id, {
        name: name.trim(),
        cacNumber: cacNumber.trim() || undefined,
        plan,
        coverageLimit: coverageLimit ? Number(coverageLimit) : undefined,
      }),
    onSuccess: () => {
      setMessage('Association settings saved.');
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      queryClient.invalidateQueries({ queryKey: ['association-dashboard', id] });
      queryClient.invalidateQueries({ queryKey: ['association-wallet', id] });
    },
    onError: (error) => {
      setMessage(error instanceof ApiError ? error.message : 'Could not save settings.');
    },
  });

  return (
    <SectionCard
      icon={Building2}
      title="Association setup"
      description="Update association profile, plan and coverage settings."
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage('');
          mutation.mutate();
        }}
      >
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Association name</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">CAC number</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            value={cacNumber}
            onChange={(event) => setCacNumber(event.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Plan tier</span>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as 'BRONZE' | 'SILVER' | 'GOLD')}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          >
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
          </select>
          <p className="mt-1 text-xs text-emerald-300">
            Weekly contribution per member: {formatNgn(PLAN_WEEKLY_CONTRIBUTION[plan])}
          </p>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-300">Coverage limit</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            value={coverageLimit}
            onChange={(event) => setCoverageLimit(event.target.value)}
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className={buttonVariants({ className: 'justify-center' })}
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? 'Saving...' : 'Save setup'}
          </button>
        </div>
      </form>
      <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
        Weekly member debits are determined by the selected plan tier.
      </div>
      {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/association/${id}`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          Back to dashboard
        </Link>
        <Link
          href={`/association/${id}/wallet`}
          className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
        >
          View wallet
        </Link>
      </div>
    </SectionCard>
  );
}
