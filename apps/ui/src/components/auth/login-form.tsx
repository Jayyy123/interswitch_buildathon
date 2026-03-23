'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { buttonVariants } from '@/components/ui/button-variants';

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormProps = {
  role: 'association' | 'clinic';
};

export function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    console.log('Login payload', { role, ...values });
    router.push(role === 'association' ? '/association/assoc-001' : '/clinic/clinic-001');
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Email</span>
        <input
          type="email"
          placeholder={role === 'association' ? 'iyaloja@association.com' : 'admin@clinic.com'}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
          {...register('email')}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Password</span>
        <input
          type="password"
          placeholder="Enter your password"
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
          {...register('password')}
        />
      </label>
      <button type="submit" className={buttonVariants({ className: 'w-full justify-center' })}>
        {role === 'association' ? 'Login as Association' : 'Login as Clinic'}
      </button>
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
}
