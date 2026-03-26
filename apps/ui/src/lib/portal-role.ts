import type { UserRole } from '@/lib/auth-types';

export const portalKindToApiRole = (kind: 'association' | 'clinic'): UserRole =>
  kind === 'association' ? 'IYALOJA' : 'CLINIC_ADMIN';
