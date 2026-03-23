import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { LoginForm } from '@/components/auth/login-form';

export default function AssociationLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <Building2 className="size-5 text-emerald-300" />
          Association Login
        </h1>
        <p className="mt-2 text-sm text-slate-300">Sign in as an association representative.</p>
        <LoginForm role="association" />
        <p className="mt-4 text-xs text-slate-400">
          Not association?{' '}
          <Link
            href="/login/clinic"
            className="text-emerald-300 underline-offset-4 hover:underline"
          >
            Switch to clinic login
          </Link>
        </p>
      </div>
    </main>
  );
}
