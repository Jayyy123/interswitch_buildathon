'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { markOnboardingComplete } from '@/lib/session';

type OnboardingSaveLinkProps = {
  href: string;
  userId: string;
  role: 'IYALOJA' | 'CLINIC_ADMIN';
  className: string;
  children: ReactNode;
};

export const OnboardingSaveLink = ({
  href,
  userId,
  role,
  className,
  children,
}: OnboardingSaveLinkProps) => (
  <Link
    href={href}
    className={className}
    onClick={() => {
      markOnboardingComplete(userId, role);
    }}
  >
    {children}
  </Link>
);
