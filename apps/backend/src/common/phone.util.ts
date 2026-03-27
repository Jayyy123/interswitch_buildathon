/**
 * Phone number normalization utilities.
 *
 * All Nigerian phone numbers can arrive in 3 formats:
 *   - Local:         07060942709   (11 digits, starts with 0)
 *   - No-prefix:   2347060942709  (13 digits, starts with 234)
 *   - International: +2347060942709 (13 digits + '+')
 *
 * ┌─────────────────┬──────────────────────────────────┐
 * │ Consumer        │ Required format                   │
 * ├─────────────────┼──────────────────────────────────┤
 * │ Termii SMS      │ +2347060942709 (international)   │
 * │ ISW Merchant    │ 07060942709   (local, starts 0)  │
 * │   Wallet API    │                                   │
 * └─────────────────┴──────────────────────────────────┘
 */

/**
 * Normalise to international format for Termii: +2347060942709
 */
export function toInternational(phone: string): string {
  const t = phone.trim().replace(/\s+/g, '');
  if (t.startsWith('+234')) return t;
  if (t.startsWith('234'))  return '+' + t;
  if (t.startsWith('0'))    return '+234' + t.slice(1);
  return t; // unknown — pass through
}

/**
 * Normalise to local format for ISW Merchant Wallet: 07060942709
 */
export function toLocal(phone: string): string {
  const t = phone.trim().replace(/\s+/g, '');
  if (t.startsWith('+234')) return '0' + t.slice(4);
  if (t.startsWith('234'))  return '0' + t.slice(3);
  if (t.startsWith('0'))    return t;
  return t; // unknown — pass through
}

/**
 * Validate that a phone number is a plausible 11-digit Nigerian number.
 * Does NOT do a network/telco check — just structural validation.
 */
export function isValidNigerianPhone(phone: string): boolean {
  const local = toLocal(phone);
  return /^0[7-9][01]\d{8}$/.test(local);
}
