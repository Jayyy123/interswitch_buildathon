'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, Wallet, RefreshCw, Copy, CheckCheck } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClinicSetup, saveClinicSetup, getClinicWallet } from '@/lib/api';

export default function ClinicSetupPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clinicId = params?.id;
  const [draft, setDraft] = useState<{ name?: string; address?: string }>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  const setupQuery = useQuery({
    queryKey: ['clinic-setup'],
    queryFn: getClinicSetup,
  });

  // Poll wallet every 10s while PROVISIONING, stop once ACTIVE
  const walletQuery = useQuery({
    queryKey: ['clinic-wallet'],
    queryFn: getClinicWallet,
    refetchInterval: (query) => (query.state.data?.status === 'PROVISIONING' ? 10_000 : false),
  });

  const wallet = walletQuery.data;

  const name = draft.name ?? setupQuery.data?.name ?? '';
  const address = draft.address ?? setupQuery.data?.address ?? '';

  const mutation = useMutation({
    mutationFn: saveClinicSetup,
    onSuccess: () => {
      setSaved(true);
      setSaveError('');
      setTimeout(() => router.push(`/clinic/${clinicId}`), 1500);
    },
    onError: (err: Error) => {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
    });
  };

  const copyAccount = () => {
    if (!wallet?.accountNumber) return;
    void navigator.clipboard.writeText(wallet.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* ── Wallet Card ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Payout Wallet</h2>
          </div>
          {wallet?.status === 'PROVISIONING' && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <RefreshCw className="size-3 animate-spin" /> Setting up…
            </span>
          )}
        </div>

        {walletQuery.isPending ? (
          <p className="text-sm text-slate-400">Loading wallet…</p>
        ) : wallet?.status === 'PROVISIONING' || wallet?.status === 'NOT_PROVISIONED' ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-sm text-amber-300">
              Your payout wallet is being provisioned. This usually takes under a minute.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Balance */}
            <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400">Available balance</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {wallet?.balanceNaira != null ? `₦${wallet.balanceNaira.toLocaleString()}` : '—'}
              </p>
            </div>

            {/* Account details */}
            <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400">Virtual account</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-lg font-semibold tracking-widest text-white">
                  {wallet?.accountNumber ?? '—'}
                </p>
                {wallet?.accountNumber && (
                  <button
                    type="button"
                    onClick={copyAccount}
                    className="text-slate-400 transition hover:text-white"
                    title="Copy account number"
                  >
                    {copied ? (
                      <CheckCheck className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {wallet?.bankName ?? 'Wema Bank'} · Fund this account to top up
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Clinic Profile Form ── */}
      <SectionCard
        icon={Building2}
        title="Clinic settings"
        description="Update your clinic name and address."
      >
        {setupQuery.isPending ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <form
            id="clinic-setup-form"
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-300">Clinic name *</span>
              <input
                id="clinic-name-input"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                placeholder="HealthPoint Clinic"
                value={name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-300">Address</span>
              <input
                id="clinic-address-input"
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
                placeholder="12 Medical Avenue, Ikeja"
                value={address}
                onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
              />
            </label>

            {saveError && <p className="text-sm text-rose-300 sm:col-span-2">{saveError}</p>}
            {saved && (
              <p className="text-sm text-emerald-400 sm:col-span-2">✓ Clinic settings saved.</p>
            )}

            <div className="sm:col-span-2">
              <button
                id="save-clinic-btn"
                type="submit"
                className={buttonVariants({ className: 'justify-center' })}
                disabled={mutation.isPending || !name.trim()}
              >
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
