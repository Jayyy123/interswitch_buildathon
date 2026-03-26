'use client';

import { useEffect, useState } from 'react';
import { AssociationHub } from '@/components/association/association-hub';
import { useAuth } from '@/contexts/auth-context';

const AssociationPage = () => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-slate-300">Loading your associations...</p>
        </div>
      </main>
    );
  }

  if (!user || user.role !== 'IYALOJA') {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-slate-300">
            You need to sign in as an association user to access this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <AssociationHub userId={user.id} />
      </div>
    </main>
  );
};

export default AssociationPage;
