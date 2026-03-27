'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, createAssociation, getMyAssociations } from '@/lib/api';
import { formatNgn, PLAN_WEEKLY_CONTRIBUTION } from '@/lib/claim-ui';

type Props = {
  userId: string;
};

export const AssociationHub = ({ userId }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'BRONZE' | 'SILVER' | 'GOLD'>('GOLD');
  const [monthlyDues, setMonthlyDues] = useState('5000');
  const [coverageLimit, setCoverageLimit] = useState('500000');

  const associationsQuery = useQuery({
    queryKey: ['associations', userId],
    queryFn: getMyAssociations,
  });

  const createAssociationMutation = useMutation({
    mutationFn: createAssociation,
    onSuccess: (association) => {
      toast.success('Association created successfully.');
      setName('');
      queryClient.invalidateQueries({ queryKey: ['associations', userId] });
      router.push(`/association/${association.id}`);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Could not create association.';
      toast.error(message);
    },
  });

  return (
    <div className="space-y-6">
      <SectionCard
        icon={Building2}
        title="Your associations"
        description="Choose an association to open its portal."
      >
        {associationsQuery.isPending ? (
          <p className="text-sm text-slate-400">Loading associations...</p>
        ) : associationsQuery.isError ? (
          <p className="text-sm text-rose-300">
            {associationsQuery.error instanceof ApiError
              ? associationsQuery.error.message
              : 'Could not load associations.'}
          </p>
        ) : associationsQuery.data.length === 0 ? (
          <p className="text-sm text-slate-400">
            No associations yet. Create your first one below.
          </p>
        ) : (
          <div className="space-y-3">
            {associationsQuery.data.map((association) => (
              <div
                key={association.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/10 p-3"
              >
                <div>
                  <p className="font-medium text-white">{association.name}</p>
                  <p className="text-xs text-slate-400">
                    Plan {association.plan} · Pool {formatNgn(association.poolBalance)}
                  </p>
                </div>
                <Link
                  href={`/association/${association.id}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {!associationsQuery.isPending && associationsQuery.data?.length === 0 && (
        <SectionCard
          icon={PlusCircle}
          title="Create association"
          description="Create a new association linked to your account."
        >
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmedName = name.trim();
              const dues = Number(monthlyDues);
              const limit = Number(coverageLimit);
              if (!trimmedName) {
                toast.error('Association name is required.');
                return;
              }
              if (!Number.isFinite(dues) || dues <= 0 || !Number.isFinite(limit) || limit <= 0) {
                toast.error('Monthly dues and coverage limit must be positive numbers.');
                return;
              }
              createAssociationMutation.mutate({
                name: trimmedName,
                plan,
                monthlyDues: dues,
                coverageLimit: limit,
              });
            }}
          >
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-300">Association name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                placeholder="Balogun Market Association"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Plan</span>
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
              <span className="mb-1 block text-slate-300">Monthly dues</span>
              <input
                type="number"
                min={1}
                value={monthlyDues}
                onChange={(event) => setMonthlyDues(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-300">Coverage limit</span>
              <input
                type="number"
                min={1}
                value={coverageLimit}
                onChange={(event) => setCoverageLimit(event.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={createAssociationMutation.isPending}
                className={buttonVariants({ className: 'w-full justify-center' })}
              >
                {createAssociationMutation.isPending ? 'Creating...' : 'Create Association'}
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-500">User: {userId.slice(0, 8)}...</p>
        </SectionCard>
      )}
    </div>
  );
};
