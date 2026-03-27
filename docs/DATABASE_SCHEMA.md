# OmoHealth – Database Schema

> This document covers all Prisma models, their purpose, relationships, and key business rules.
> Schema file: [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma)

---

## Overview

The schema is built around **three types of users** (distinguished by `User.role`), with domain-specific profile models attached to each:

```
User (role = IYALOJA)      ──▶ Association ──▶ Member[] ──▶ Wallet
                                            ──▶ Contribution[]
                                            ──▶ Claim[]

User (role = MEMBER)       ──▶ Member (optional — if member has a login)

User (role = CLINIC_ADMIN) ──▶ ClinicAdmin ──▶ Clinic
```

> An Iyaloja **is a Member** — she can be enrolled in her own association pool (separate `Member` row) while still being the admin (`Association` owner).

---

## Enums

| Enum | Values |
|---|---|
| `UserRole` | `IYALOJA`, `MEMBER`, `CLINIC_ADMIN` |
| `PlanTier` | `BRONZE`, `SILVER`, `GOLD` |
| `MemberStatus` | `ACTIVE`, `PAUSED`, `FLAGGED`, `INCOMPLETE` |
| `ContributionSource` | `DIRECT_DEBIT`, `CASH` |
| `ContributionStatus` | `PENDING`, `SUCCESS`, `FAILED` |
| `ClaimStatus` | `PENDING`, `APPROVED`, `PAID`, `REJECTED`, `FAILED` |

---

## Models

### `User`
Central auth table. One row per person who can log in. Auth is **phone + OTP** (via Termii) — no passwords.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `phone` | `String` | Unique; used for OTP login |
| `role` | `UserRole` | `IYALOJA` / `MEMBER` / `CLINIC_ADMIN` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Relations**: `association?`, `member?`, `clinicAdmin?`

---

### `OtpCode`
Short-lived OTP for phone login. All user roles share this table.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `phone` | `String` | |
| `code` | `String` | bcrypt-hashed 6-digit code |
| `expiresAt` | `DateTime` | 5 minutes from creation |
| `used` | `Boolean` | Invalidated after first use |
| `createdAt` | `DateTime` | |

---

### `Association`
The health pool. Managed by one Iyaloja. Holds the pool balance, plan tier, and Interswitch wallet references.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `userId` | `String` | FK → `User` (the Iyaloja), unique |
| `name` | `String` | Association/union name |
| `cacNumber` | `String?` | Optional CAC registration number |
| `plan` | `PlanTier` | `BRONZE` / `SILVER` / `GOLD` |
| `monthlyDues` | `Float?` | Optional custom dues override |
| `coverageLimit` | `Float?` | Optional custom coverage override |
| `poolBalance` | `Float` | Stored & updated — **not computed** |
| `walletId` | `String?` | Interswitch merchant wallet ID for the Iyaloja |
| `walletAccountNumber` | `String?` | Settlement account number (for receiving payments) |
| `anniversaryDate` | `DateTime?` | Coverage resets annually on this date |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Plan tiers:**

| Tier | Weekly Contribution | Annual Coverage | Max per Claim |
|---|---|---|---|
| `BRONZE` | ₦500 | ₦100,000 | ₦75,000 |
| `SILVER` | ₦1,000 | ₦150,000 | ₦100,000 |
| `GOLD` | ₦2,000 | ₦300,000 | ₦200,000 |

> `poolBalance` is the source of truth for claim eligibility. It is incremented on every successful `Contribution` and decremented on every `PAID` `Claim`.

---

### `Member`
A person enrolled in a specific association. A single person can appear in multiple associations as separate rows (coverage tracks independently per association).

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `userId` | `String?` | Optional FK → `User` (set only if member has app login) |
| `associationId` | `String` | FK → `Association` |
| `bvn` | `String` | Used for Interswitch BVN lookup on enrollment |
| `phone` | `String` | Resolved from BVN API |
| `name` | `String?` | Resolved from BVN API |
| `status` | `MemberStatus` | `ACTIVE` / `PAUSED` / `FLAGGED` / `INCOMPLETE` |
| `walletId` | `String?` | Interswitch merchant wallet ID for this member |
| `walletAccountNumber` | `String?` | Settlement account number (dues are debited from this) |
| `walletStatus` | `String` | `PENDING` / `PROVISIONING` / `ACTIVE` / `FAILED` (BullMQ state) |
| `coverageUsedThisYear` | `Float` | Tracks annual limit spend — resets on `anniversaryDate` |
| `consecutiveMissedPayments` | `Int` | Flags member to Iyaloja after 3 consecutive misses |
| `optOut` | `Boolean` | Set via SMS `STOP` keyword |
| `waitingPeriodStart` | `DateTime` | 30-day minor / 90-day major claim waiting period starts here |
| `enrolledAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Unique constraint**: `(associationId, bvn)` — no duplicate BVN per association.

**`MemberStatus` meanings:**

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal — being debited, can claim |
| `PAUSED` | Opted out via SMS STOP — no debits, no claims |
| `FLAGGED` | Admin-flagged — claims blocked |
| `INCOMPLETE` | BVN API returned no phone — wallet not yet created |

---

### `Wallet`
One wallet per `Member`. Stores the Interswitch wallet reference used for Direct Debit.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `memberId` | `String` | FK → `Member`, unique |
| `interswitchRef` | `String` | Interswitch wallet ID, unique |
| `balance` | `Float` | Mirror of Interswitch wallet balance |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

> A `Member` with status `INCOMPLETE` will not have a `Wallet` until their phone is confirmed via BVN API.

---

### `Contribution`
One row per weekly debit attempt or manual cash entry. Tracks money **in** to the pool.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `memberId` | `String` | FK → `Member` |
| `associationId` | `String` | FK → `Association` |
| `amount` | `Float` | In Naira |
| `source` | `ContributionSource` | `DIRECT_DEBIT` / `CASH` |
| `status` | `ContributionStatus` | `PENDING` / `SUCCESS` / `FAILED` |
| `interswitchRef` | `String?` | Interswitch debit reference |
| `week` | `DateTime` | The Monday this contribution covers |
| `createdAt` | `DateTime` | |

> On `status → SUCCESS`, `Association.poolBalance` is incremented.
>
> A member is **never double-debited** — before triggering Interswitch, the scheduler checks for an existing `Contribution` with the same `(memberId, week)` and `status != FAILED`.

---

### `Claim`
One row per hospital payout request. Tracks money **out** of the pool.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `associationId` | `String` | FK → `Association` |
| `memberId` | `String` | FK → `Member` |
| `clinicId` | `String?` | FK → `Clinic` (set for clinic-portal-submitted claims) |
| `clinicAdminId` | `String?` | FK → `ClinicAdmin` (set for clinic-portal-submitted claims) |
| `hospitalName` | `String` | Kept for display and manual/legacy claim compatibility |
| `hospitalAccount` | `String?` | Bank account for Interswitch transfer |
| `hospitalBankCode` | `String?` | CBN bank code (e.g. `"044"` for Access Bank) |
| `billAmount` | `Float` | What the hospital charged |
| `approvedAmount` | `Float?` | Capped at plan limit — what the pool pays |
| `billPhotoUrl` | `String?` | Bill image URL |
| `status` | `ClaimStatus` | See flow below |
| `interswitchRef` | `String?` | Interswitch payment reference |
| `otpVerified` | `Boolean` | Required for claims > ₦50,000 (Safe Token OTP) |
| `description` | `String?` | Diagnosis / notes |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**`ClaimStatus` flow:**

```
PENDING → APPROVED → PAID
                   ↘ FAILED (hospital transfer bounced — retry within 24h)
        → REJECTED
```

> Claim creation checks: member `status = ACTIVE`, waiting period elapsed, `coverageUsedThisYear + approvedAmount ≤ annual limit`, pool balance ≥ approvedAmount.
>
> On `PAID`: `Association.poolBalance` is decremented, `Member.coverageUsedThisYear` is incremented.

---

### `Clinic`
A healthcare institution with its own staff (ClinicAdmins) and bank payout details.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `name` | `String` | Clinic name |
| `address` | `String?` | Physical address |
| `bankAccount` | `String?` | Clinic's bank account for direct payouts |
| `bankCode` | `String?` | CBN bank code |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Relations**: `admins[]` (ClinicAdmin), `claims[]` (Claim)

---

### `ClinicAdmin`
A clinic staff user who can look up patient coverage and submit claims via the Clinic Portal.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `clinicId` | `String` | FK → `Clinic` |
| `userId` | `String` | FK → `User`, unique (one user → one clinic) |

**Clinic Portal flow**: Enter patient phone number → system looks up `Member` by phone → returns `status`, plan tier, `coverageUsedThisYear`, and remaining annual coverage.

---

## Entity Relationship Diagram

```
User ──────────────────┬──▶ Association ──┬──▶ Member[] ──▶ Wallet
                       │                  ├──▶ Contribution[]
                       │                  └──▶ Claim[]
                       ├──▶ Member (optional — if user is also a member)
                       └──▶ ClinicAdmin ──▶ Clinic ──▶ ClinicAdmin[]
                                                    └──▶ Claim[]

OtpCode (standalone — keyed on phone, no FK)
```

---

## Business Rules Summary

| Rule | Enforcement |
|---|---|
| No double-debit | Check `(memberId, week)` before triggering Interswitch |
| Paused member can't claim | `ClaimsService` checks `member.status` first — throws 403 |
| Waiting period enforced | Minor: 30 days, Major: 90 days from `waitingPeriodStart` |
| Annual coverage limit | `coverageUsedThisYear + approvedAmount ≤ plan annual limit` |
| Pool balance check | `poolBalance ≥ approvedAmount` before firing Payment Gateway |
| Large claim OTP | Safe Token OTP required for claims > ₦50,000 |
| OTP expiry | `expiresAt` checked on verify — 5-minute window |
| Claim retry window | Failed hospital transfer can be retried within 24 hours |
| Wallet dedup | Unique `(associationId, bvn)` constraint on `Member` |
