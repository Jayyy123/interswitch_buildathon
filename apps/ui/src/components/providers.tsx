'use client';

import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/contexts/auth-context';

export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                'border border-white/10 bg-slate-900/95 text-slate-100 shadow-lg backdrop-blur',
              title: 'text-slate-100',
              description: 'text-slate-300',
              error: '!border-rose-500/50 !bg-slate-900/95',
              success: '!border-emerald-500/50 !bg-slate-900/95',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
};
