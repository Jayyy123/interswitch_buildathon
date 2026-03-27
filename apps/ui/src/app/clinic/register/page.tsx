'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, registerClinic } from '@/lib/api';

export default function ClinicRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: registerClinic,
    onSuccess: (data) => {
      router.push(`/clinic/${data.clinicId}`);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankCode: bankCode.trim() || undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15">
            <Building2 className="size-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Register your clinic</h1>
            <p className="text-sm text-slate-400">
              This is a one-time setup. You can update details later.
            </p>
          </div>
        </div>

        <form id="clinic-register-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Clinic name *</span>
            <input
              id="clinic-name-input"
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              placeholder="HealthPoint Clinic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-300">Address</span>
            <input
              id="clinic-address-input"
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              placeholder="12 Medical Avenue, Ikeja"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Bank account</span>
              <input
                id="bank-account-input"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="0099553344"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Bank code</span>
              <input
                id="bank-code-input"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="011"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
              />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Bank details are needed for automatic claim payouts. You can add them later in Settings.
          </p>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            id="register-clinic-btn"
            type="submit"
            disabled={mutation.isPending || !name.trim()}
            className={buttonVariants({ className: 'w-full justify-center' })}
          >
            {mutation.isPending ? 'Setting up…' : 'Create clinic & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
