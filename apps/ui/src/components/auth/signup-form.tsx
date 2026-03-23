'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { buttonVariants } from '@/components/ui/button-variants';

type SignupFormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type SignupFormProps = {
  role: 'association' | 'clinic';
};

export function SignupForm({ role }: SignupFormProps) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<SignupFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    console.log('Signup payload', { role, ...values });
    router.push(
      role === 'association' ? '/association/assoc-001/setup' : '/clinic/clinic-001/setup',
    );
  };

  return (
    <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-slate-300">Full Name</span>
        <input
          placeholder={role === 'association' ? 'Amina Yusuf' : 'Dr. Tobi Adewale'}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          {...register('fullName')}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Email</span>
        <input
          type="email"
          placeholder={role === 'association' ? 'iyaloja@association.com' : 'admin@clinic.com'}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          {...register('email')}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Phone</span>
        <input
          placeholder="+234 801 234 5678"
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          {...register('phone')}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Password</span>
        <input
          type="password"
          placeholder="Create a password"
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          {...register('password')}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-300">Confirm Password</span>
        <input
          type="password"
          placeholder="Re-enter your password"
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2"
          {...register('confirmPassword')}
        />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className={buttonVariants({ className: 'w-full justify-center' })}>
          {role === 'association' ? 'Create association account' : 'Create clinic account'}
        </button>
      </div>
    </form>
  );
}
