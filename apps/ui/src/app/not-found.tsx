import Link from 'next/link';
import { Ghost } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';

const NotFoundPage = () => {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-14 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          <Ghost className="size-4" />
          Not Found
        </div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-300">
          The page you requested does not exist or is unavailable.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className={buttonVariants({ className: 'justify-center' })}>
            Back home
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
