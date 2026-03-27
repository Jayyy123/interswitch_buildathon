'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClinicSetup, saveClinicSetup } from '@/lib/api';

export default function ClinicSetupPage() {
  const [draft, setDraft] = useState<{
    name?: string;
    address?: string;
    bankAccount?: string;
    bankCode?: string;
  }>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const setupQuery = useQuery({
    queryKey: ['clinic-setup'],
    queryFn: getClinicSetup,
  });
  const name = draft.name ?? setupQuery.data?.name ?? '';
  const address = draft.address ?? setupQuery.data?.address ?? '';
  const bankAccount = draft.bankAccount ?? setupQuery.data?.bankAccount ?? '';
  const bankCode = draft.bankCode ?? setupQuery.data?.bankCode ?? '';

  const mutation = useMutation({
    mutationFn: saveClinicSetup,
    onSuccess: () => {
      setSaved(true);
      setSaveError('');
      setTimeout(() => setSaved(false), 3000);
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
      bankAccount: bankAccount.trim() || undefined,
      bankCode: bankCode.trim() || undefined,
    });
  };

  return (
    <SectionCard
      icon={Building2}
      title="Clinic settings"
      description="Update your clinic profile and payout bank details."
    >
      {setupQuery.isPending ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <form id="clinic-setup-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Bank account number</span>
            <input
              id="bank-account-input"
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
              placeholder="0099553344"
              value={bankAccount}
              onChange={(e) => setDraft((prev) => ({ ...prev, bankAccount: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Bank code (CBN)</span>
            <input
              id="bank-code-input"
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
              placeholder="011 (First Bank)"
              value={bankCode}
              onChange={(e) => setDraft((prev) => ({ ...prev, bankCode: e.target.value }))}
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
  );
}
