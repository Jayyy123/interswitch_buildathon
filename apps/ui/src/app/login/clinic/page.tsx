import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

import { LoginForm } from '@/components/auth/login-form';

export default function ClinicLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <HeartPulse className="size-5 text-emerald-300" />
          Clinic Login
        </h1>
        <p className="mt-2 text-sm text-slate-300">Sign in as a clinic representative.</p>
        <LoginForm role="clinic" />
        <p className="mt-4 text-xs text-slate-400">
          Not clinic?{' '}
          <Link
            href="/login/association"
            className="text-emerald-300 underline-offset-4 hover:underline"
          >
            Switch to association login
          </Link>
        </p>
      </div>
    </main>
  );
}
