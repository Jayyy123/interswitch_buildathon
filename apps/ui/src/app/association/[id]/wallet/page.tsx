'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PiggyBank, Target, WalletCards } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationWallet, verifyAssociationPayment } from '@/lib/api';
import { formatNgn } from '@/lib/claim-ui';

const AssociationWalletPage = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [transactionReference, setTransactionReference] = useState('');
  const [amountKobo, setAmountKobo] = useState('');
  const [message, setMessage] = useState('');
  const walletQuery = useQuery({
    queryKey: ['association-wallet', id],
    queryFn: () => getAssociationWallet(id),
  });
  const mutation = useMutation({
    mutationFn: () =>
      verifyAssociationPayment(id, {
        transactionReference: transactionReference.trim(),
        amountKobo: Number(amountKobo),
      }),
    onSuccess: (response) => {
      setMessage(
        response.success
          ? `Payment verified. Credited ${formatNgn(response.credited ?? 0)}`
          : (response.message ?? 'Verification failed.'),
      );
      queryClient.invalidateQueries({ queryKey: ['association-wallet', id] });
      queryClient.invalidateQueries({ queryKey: ['association-dashboard', id] });
    },
    onError: (error) => {
      setMessage(error instanceof ApiError ? error.message : 'Could not verify payment.');
    },
  });
  const wallet = walletQuery.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={WalletCards}
          label="Wallet Balance"
          value={walletQuery.isPending ? '…' : formatNgn(wallet?.poolBalance ?? 0)}
        />
        <StatCard
          icon={Target}
          label="Weekly Target"
          value={walletQuery.isPending ? '…' : formatNgn(wallet?.weeklyTarget ?? 0)}
        />
        <StatCard
          icon={PiggyBank}
          label="Collected This Week"
          value={walletQuery.isPending ? '…' : formatNgn(wallet?.collectedThisWeek ?? 0)}
          hint={
            wallet?.weeklyTarget
              ? `${Math.round((wallet.collectedThisWeek / wallet.weeklyTarget) * 100)}% progress`
              : 'No active members yet'
          }
        />
      </section>
      {walletQuery.isError ? (
        <p className="text-sm text-rose-300">
          {walletQuery.error instanceof ApiError
            ? walletQuery.error.message
            : 'Could not load wallet details.'}
        </p>
      ) : null}
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
            <p className="font-medium text-white">{wallet?.walletAccountNumber ?? 'Pending'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Wallet ID</p>
            <p className="font-medium text-white">{wallet?.walletId ?? 'Pending'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <p className="text-slate-400">Status</p>
            <p className="font-medium text-emerald-300">
              {wallet?.walletId ? 'Active' : 'Provisioning'}
            </p>
          </div>
        </div>
      </SectionCard>
      <SectionCard
        icon={PiggyBank}
        title="Verify top-up payment"
        description="Use transaction reference from checkout to credit pool."
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage('');
            if (!transactionReference.trim() || !Number.isFinite(Number(amountKobo))) {
              setMessage('Transaction reference and amount in kobo are required.');
              return;
            }
            mutation.mutate();
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Transaction reference</span>
            <input
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Amount (kobo)</span>
            <input
              value={amountKobo}
              onChange={(event) => setAmountKobo(event.target.value)}
              type="number"
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={buttonVariants({ className: 'justify-center' })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Verifying...' : 'Verify payment'}
            </button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
      </SectionCard>
    </div>
  );
};

export default AssociationWalletPage;
