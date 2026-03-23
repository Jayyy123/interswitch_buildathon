import Link from 'next/link';
import { Building2, HeartPulse, UserPlus } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <UserPlus className="size-5 text-emerald-300" />
          Create account as
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Pick your role and continue to the full signup form.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 text-sm">
          <Link
            href="/signup/association"
            className={buttonVariants({ className: 'justify-center' })}
          >
            <Building2 className="size-4" />
            Association
          </Link>
          <Link
            href="/signup/clinic"
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            <HeartPulse className="size-4" />
            Clinic
          </Link>
        </div>
      </div>
    </main>
  );
}
