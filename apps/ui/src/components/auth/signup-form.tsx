'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { buttonVariants } from '@/components/ui/button-variants';
import { useAuth } from '@/contexts/auth-context';
import { ApiError, sendOtp, verifyOtp } from '@/lib/api';
import { portalKindToApiRole } from '@/lib/portal-role';
import type { AuthUser } from '@/lib/auth-types';
import { isOnboardingComplete } from '@/lib/session';

type SignupFormValues = {
  phone: string;
  code: string;
};

type SignupFormProps = {
  role: 'association' | 'clinic';
};

export const SignupForm = ({ role }: SignupFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, hydrated } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [pendingPhone, setPendingPhone] = useState('');

  const apiRole = portalKindToApiRole(role);

  const { register, handleSubmit, reset, watch } = useForm<SignupFormValues>({
    defaultValues: { phone: '', code: '' },
  });

  const phoneValue = watch('phone');

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.role !== apiRole) return;
    const next =
      searchParams.get('next') ||
      (role === 'association' ? `/association/${user.id}/setup` : `/clinic/${user.id}/setup`);
    router.replace(next);
  }, [hydrated, user, apiRole, role, router, searchParams]);

  const setupPath = (u: AuthUser) =>
    role === 'association' ? `/association/${u.id}/setup` : `/clinic/${u.id}/setup`;

  const sendOtpMutation = useMutation({
    mutationFn: sendOtp,
  });

  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtp,
  });

  const submitting = sendOtpMutation.isPending || verifyOtpMutation.isPending;

  const onSendOtp = async (values: SignupFormValues) => {
    const phone = values.phone.trim();
    if (!phone) {
      toast.error('Enter your phone number.');
      return;
    }
    try {
      const res = await sendOtpMutation.mutateAsync(phone);
      setPendingPhone(phone);
      setStep('code');
      reset({ phone, code: '' });
      toast.success(res.message);
      if (res.code) {
        toast.info(`Dev OTP: ${res.code}`, { duration: 12_000 });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not send verification code.';
      toast.error(msg);
    }
  };

  const onVerify = async (values: SignupFormValues) => {
    const code = values.code.trim();
    if (!code) {
      toast.error('Enter the code we sent to your phone.');
      return;
    }
    try {
      const res = await verifyOtpMutation.mutateAsync({
        phone: pendingPhone,
        code,
        role: apiRole,
      });
      const authUser: AuthUser = {
        id: res.user.id,
        phone: res.user.phone,
        role: res.user.role as AuthUser['role'],
      };
      if (isOnboardingComplete(authUser.id, authUser.role)) {
        toast.error('This account already exists. Please login instead.');
        const loginPath = role === 'association' ? '/login/association' : '/login/clinic';
        router.push(loginPath);
        return;
      }
      login(res.accessToken, authUser);
      const next = searchParams.get('next') || setupPath(authUser);
      toast.success('Account ready. Let’s finish setup.');
      router.push(next);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Verification failed.';
      toast.error(msg);
    }
  };

  return (
    <form
      className="mt-6 grid gap-4 sm:grid-cols-2"
      onSubmit={handleSubmit(step === 'phone' ? onSendOtp : onVerify)}
    >
      {step === 'phone' ? (
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-300">Phone number</span>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            {...register('phone')}
          />
          <span className="mt-2 block text-xs text-slate-500">
            We’ll text a one-time code. No password required.
          </span>
        </label>
      ) : (
        <>
          <p className="text-sm text-slate-400 sm:col-span-2">
            Code sent to <span className="text-slate-200">{pendingPhone}</span>.{' '}
            <button
              type="button"
              className="text-emerald-300 underline-offset-4 hover:underline"
              onClick={() => {
                setStep('phone');
                reset({ phone: phoneValue, code: '' });
              }}
            >
              Change number
            </button>
          </p>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-300">One-time code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm tracking-widest"
              {...register('code')}
            />
          </label>
        </>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className={buttonVariants({ className: 'w-full justify-center' })}
        >
          {submitting
            ? 'Please wait…'
            : step === 'phone'
              ? 'Send verification code'
              : role === 'association'
                ? 'Verify & continue setup'
                : 'Verify & continue setup'}
        </button>
      </div>
      {step === 'code' ? (
        <div className="sm:col-span-2">
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              try {
                const res = await sendOtpMutation.mutateAsync(pendingPhone);
                toast.success(res.message);
                if (res.code) {
                  toast.info(`Dev OTP: ${res.code}`, { duration: 12_000 });
                }
              } catch (e) {
                const msg = e instanceof ApiError ? e.message : 'Could not resend code.';
                toast.error(msg);
              }
            }}
            className={buttonVariants({
              variant: 'outline',
              className: 'w-full justify-center',
            })}
          >
            Resend code
          </button>
        </div>
      ) : null}
      <p className="pt-2 text-sm text-slate-300 sm:col-span-2">
        Already have an account?{' '}
        <Link
          href={role === 'association' ? '/login/association' : '/login/clinic'}
          className="text-emerald-300 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
};
