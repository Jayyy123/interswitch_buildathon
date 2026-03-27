import type { AuthUser } from '@/lib/auth-types';

const TOKEN_KEY = 'omo_access_token';
const USER_KEY = 'omo_user';

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const ONBOARDING_PREFIX = 'omo_onboarding_done';

const onboardingKey = (userId: string, role: string) => `${ONBOARDING_PREFIX}:${role}:${userId}`;

export const persistSession = (token: string, user: AuthUser) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `omo_session=1; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  document.cookie = `omo_role=${user.role}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'omo_session=; path=/; max-age=0';
  document.cookie = 'omo_role=; path=/; max-age=0';
};

export const syncCookiesFromStorage = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  if (token && user) {
    persistSession(token, user);
  }
};

export const isOnboardingComplete = (userId: string, role: string): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(onboardingKey(userId, role)) === '1';
};

export const markOnboardingComplete = (userId: string, role: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(onboardingKey(userId, role), '1');
};
