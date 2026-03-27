'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { buttonVariants } from '@/components/ui/button-variants';
import { useAuth } from '@/contexts/auth-context';
import { ApiError, sendOtp, verifyOtp } from '@/lib/api';
import { portalKindToApiRole } from '@/lib/portal-role';
import type { AuthUser } from '@/lib/auth-types';

type LoginFormValues = {
  phone: string;
  code: string;
};

type LoginFormProps = {
  role: 'association' | 'clinic';
};

export const LoginForm = ({ role }: LoginFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, hydrated } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [pendingPhone, setPendingPhone] = useState('');

  const apiRole = portalKindToApiRole(role);

  const { register, handleSubmit, reset, watch } = useForm<LoginFormValues>({
    defaultValues: { phone: '', code: '' },
  });

  const phoneValue = watch('phone');
  const roleReasonToast = useRef(false);

  useEffect(() => {
    if (roleReasonToast.current) return;
    if (searchParams.get('reason') !== 'role') return;
    roleReasonToast.current = true;
    toast.error(
      role === 'association'
        ? 'Sign in with your association account to open this portal.'
        : 'Sign in with your clinic account to open this portal.',
    );
  }, [searchParams, role]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (user.role !== apiRole) return;
    // Returning clinic users: use the stored clinicId, fall back to /clinic/register for old sessions missing it
    const next =
      searchParams.get('next') ||
      (role === 'association'
        ? '/association'
        : user.clinicId
          ? `/clinic/${user.clinicId}`
          : '/clinic/register');
    router.replace(next);
  }, [hydrated, user, apiRole, role, router, searchParams]);

  const defaultPath = (res: {
    user: { id: string };
    hasClinic: boolean;
    clinicId: string | null;
    hasAssociation: boolean;
  }) => {
    if (role === 'clinic') {
      if (!res.hasClinic) return '/clinic/register';
      return `/clinic/${res.clinicId}`;
    }
    return '/association';
  };

  const sendOtpMutation = useMutation({
    mutationFn: sendOtp,
  });

  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtp,
  });

  const submitting = sendOtpMutation.isPending || verifyOtpMutation.isPending;

  const onSendOtp = async (values: LoginFormValues) => {
    const phone = values.phone.trim();
    if (!phone) {
      toast.error('Enter the phone number linked to your account.');
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

  const onVerify = async (values: LoginFormValues) => {
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
        clinicId: res.clinicId ?? null,
      };
      login(res.accessToken, authUser);
      const next = searchParams.get('next') || defaultPath(res);
      toast.success('Signed in successfully.');
      router.push(next);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Verification failed.';
      toast.error(msg);
    }
  };

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={handleSubmit(step === 'phone' ? onSendOtp : onVerify)}
    >
      {step === 'phone' ? (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Phone number</span>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            {...register('phone')}
          />
        </label>
      ) : (
        <>
          <p className="text-sm text-slate-400">
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
          <label className="block text-sm">
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
              ? 'Verify & enter portal'
              : 'Verify & enter portal'}
      </button>
      {step === 'code' ? (
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
      ) : null}
      <p className="pt-2 text-sm text-slate-300">
        New user?{' '}
        <Link
          href={role === 'association' ? '/signup/association' : '/signup/clinic'}
          className="text-emerald-300 underline-offset-4 hover:underline"
        >
          Create account
        </Link>
      </p>
    </form>
  );
};
