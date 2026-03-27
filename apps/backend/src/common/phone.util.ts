/**
 * Nigerian phone number utilities — backed by Google's libphonenumber-js.
 *
 * All functions assume Nigeria (NG) and reject any number that is not a valid
 * Nigerian mobile number.
 *
 * ┌─────────────────┬──────────────────────────────────┐
 * │ Consumer        │ Required format                   │
 * ├─────────────────┼──────────────────────────────────┤
 * │ Termii SMS      │ +2348012345678  (E.164 / toE164) │
 * │ ISW Merchant    │ 08012345678     (local / toLocal) │
 * │   Wallet API    │                                   │
 * └─────────────────┴──────────────────────────────────┘
 */

import { BadRequestException } from '@nestjs/common';
import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from 'libphonenumber-js';

/**
 * Parse and validate a Nigerian phone number.
 * Accepts: 08012345678 | +2348012345678 | 2348012345678
 * Throws 400 BadRequest if the number is not a valid NG number.
 */
export function parseNigerianPhone(raw: string): PhoneNumber {
  const phone = parsePhoneNumberFromString(raw.trim(), 'NG');
  if (!phone || !phone.isValid()) {
    throw new BadRequestException(
      `"${raw}" is not a valid Nigerian phone number. Use +2348XXXXXXXXX or 08XXXXXXXXX format.`,
    );
  }
  return phone;
}

/** E.164 format for Termii SMS: +2348012345678 */
export function toE164(raw: string): string {
  return parseNigerianPhone(raw).format('E.164');
}

/** Alias — Termii service imports this name */
export const toInternational = toE164;

/** Local format for ISW Merchant Wallet: 08012345678 */
export function toLocal(raw: string): string {
  return parseNigerianPhone(raw).formatNational().replace(/\s/g, '');
}

/**
 * Returns all storage variants of a Nigerian number so DB lookups match
 * regardless of how the number was originally stored.
 *
 * Example: "08012345678" → ["+2348012345678", "08012345678"]
 */
export function phoneVariants(raw: string): string[] {
  const phone = parseNigerianPhone(raw);
  const e164     = phone.format('E.164');
  const national = phone.formatNational().replace(/\s/g, '');
  return Array.from(new Set([e164, national, raw.trim()]));
}

/** Non-throwing structural validation. */
export function isValidNigerianPhone(raw: string): boolean {
  try { parseNigerianPhone(raw); return true; }
  catch { return false; }
}
