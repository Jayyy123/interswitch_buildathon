import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { SignupForm } from '@/components/auth/signup-form';

export default function AssociationSignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <Building2 className="size-5 text-emerald-300" />
          Create Association Account
        </h1>
        <p className="mt-2 text-sm text-slate-300">Onboard as an association representative.</p>
        <SignupForm role="association" />
        <p className="mt-4 text-xs text-slate-400">
          Registering a clinic instead?{' '}
          <Link
            href="/signup/clinic"
            className="text-emerald-300 underline-offset-4 hover:underline"
          >
            Switch to clinic signup
          </Link>
        </p>
      </div>
    </main>
  );
}
