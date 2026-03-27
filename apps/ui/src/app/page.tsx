import Link from 'next/link';
import { ArrowRight, Building2, HeartPulse, ShieldPlus } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';

const Home = () => {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-sky-500/20 p-6">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-200">
            <ShieldPlus className="size-3.5" />
            Omo Health
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Community HMO Management</h1>
          <p className="mt-3 max-w-xl text-sm text-slate-200">
            Representatives can run associations, onboard members, track contributions, and manage
            claims. Clinics can request claims directly against member IDs.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Association Representative</h2>
            <p className="mt-2 text-sm text-slate-300">
              Set up your association, enroll members, monitor wallet and approve claims.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/signup/association"
                className={buttonVariants({ className: 'justify-center' })}
              >
                <Building2 className="size-4" />
                Sign up
              </Link>
              <Link
                href="/login/association"
                className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
              >
                <ArrowRight className="size-4" />
                Open portal
              </Link>
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Clinic Representative</h2>
            <p className="mt-2 text-sm text-slate-300">
              Create claim requests for members and monitor approvals from associations.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/signup/clinic"
                className={buttonVariants({ className: 'justify-center' })}
              >
                <HeartPulse className="size-4" />
                Sign up
              </Link>
              <Link
                href="/login/clinic"
                className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
              >
                <ArrowRight className="size-4" />
                Open portal
              </Link>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Get started</h2>
          <p className="mt-2 text-sm text-slate-300">
            Sign in to create and manage your association or clinic.
          </p>
          <Link href="/login" className={buttonVariants({ className: 'mt-4 justify-center' })}>
            <ArrowRight className="size-4" />
            Go to Login
          </Link>
        </section>
      </div>
    </main>
  );
};

export default Home;
