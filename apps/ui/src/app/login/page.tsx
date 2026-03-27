import Link from 'next/link';
import { Building2, HeartPulse, LogIn } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';

const LoginPage = () => {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <LogIn className="size-5 text-emerald-300" />
          Login as
        </h1>
        <p className="mt-2 text-sm text-slate-300">Choose your role to continue.</p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href="/login/association"
            className={buttonVariants({ className: 'justify-center' })}
          >
            <Building2 className="size-4" />
            Association
          </Link>
          <Link
            href="/login/clinic"
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            <HeartPulse className="size-4" />
            Clinic
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-300">
          New user?{' '}
          <Link href="/signup" className="text-emerald-300 underline-offset-4 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
