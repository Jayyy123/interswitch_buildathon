# OmoHealth – Database Schema

> This document covers all Prisma models, their purpose, relationships, and key business rules.

---

## Overview

The schema is built around **three types of users** (distinguished by `User.role`), with domain-specific profile models attached to each:

```
User (role = IYALOJA)     ──▶ Association ──▶ Member[]
                                           ──▶ Contribution[]
                                           ──▶ Claim[]

User (role = MEMBER)      ──▶ Member (optional — if member has a login)

User (role = CLINIC_ADMIN) ──▶ ClinicAdmin
```

> An Iyaloja **is a Member** — she can be enrolled in her own association pool (separate `Member` row) while still being the admin (`Association` owner). There is no separate `Iyaloja` profile model.

---

## Models

### `User`
Central auth table. One row per person who can log in. Auth is **phone + OTP** (via Termii) — no passwords.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `phone` | `String` | Unique, used for OTP login |
| `role` | `UserRole` | `IYALOJA` / `MEMBER` / `CLINIC_ADMIN` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Relations**: `association?`, `member?`, `clinicAdmin?`

---

### `Association`
The health pool. Managed by one Iyaloja. Holds the pool balance and connects to all members, contributions, and claims.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `userId` | `String` | FK → `User` (the Iyaloja), unique |
| `name` | `String` | Association/union name |
| `cacNumber` | `String?` | Optional CAC registration |
| `plan` | `PlanTier` | `BRONZE` / `SILVER` / `GOLD` |
| `poolBalance` | `Float` | Stored & updated — **not computed** |
| `anniversaryDate` | `DateTime?` | Coverage resets on this date each year |

**Plan tiers:**

| Tier | Weekly Contribution | Annual Coverage | Max per Claim |
|---|---|---|---|
| `BRONZE` | ₦500 | ₦100,000 | ₦75,000 |
| `SILVER` | ₦1,000 | ₦150,000 | ₦100,000 |
| `GOLD` | ₦2,000 | ₦300,000 | ₦200,000 |

> `poolBalance` is the source of truth for whether a claim can be paid. It is incremented on every successful `Contribution` and decremented on every `PAID` `Claim`.

---

### `Member`
A person enrolled in a specific association. A person can appear in multiple associations as separate `Member` rows (coverage stacks independently).

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `userId` | `String?` | Optional FK → `User` (set only if member has app login) |
| `associationId` | `String` | FK → `Association` |
| `bvn` | `String` | Used for Interswitch BVN lookup on enrollment |
| `phone` | `String` | Resolved from BVN API |
| `name` | `String?` | Resolved from BVN API |
| `status` | `MemberStatus` | `ACTIVE` / `PAUSED` / `FLAGGED` / `INCOMPLETE` |
| `coverageUsedThisYear` | `Float` | Tracks annual limit spend — resets on `anniversaryDate` |
| `optOut` | `Boolean` | Set via SMS `STOP` keyword |
| `waitingPeriodStart` | `DateTime` | 30-day minor / 90-day major claim waiting period starts here |
| `enrolledAt` | `DateTime` | |

**Unique constraint**: `(associationId, bvn)` — no duplicate BVN in the same association.

**`MemberStatus` meanings:**

| Status | Meaning |
|---|---|
| `ACTIVE` | Normal — being debited, can claim |
| `PAUSED` | Opted out via SMS STOP — no debits, no claims |
| `FLAGGED` | Admin-flagged — claims blocked |
| `INCOMPLETE` | BVN API returned no phone — wallet not created yet |

---

### `Wallet`
One wallet per `Member`. Stores the Interswitch wallet reference used for direct debit.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `memberId` | `String` | FK → `Member`, unique |
| `interswitchRef` | `String` | Interswitch wallet ID, unique |
| `balance` | `Float` | Mirror of Interswitch wallet balance |

> A `Member` with status `INCOMPLETE` will not have a `Wallet` until their phone is confirmed.

---

### `Contribution`
One row per weekly debit attempt (or manual cash entry). Tracks money **in** to the pool.

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

> On `status → SUCCESS`, `Association.poolBalance` is incremented. On `FAILED`, pool balance is unchanged and the contribution is logged for admin visibility.
>
> A member is **never double-debited** — before firing Interswitch, we check for an existing `Contribution` with the same `(memberId, week)` and `status != FAILED`.

---

### `Claim`
One row per hospital payout request. Tracks money **out** of the pool.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `associationId` | `String` | FK → `Association` |
| `memberId` | `String` | FK → `Member` |
| `hospitalName` | `String` | |
| `hospitalAccount` | `String?` | Bank account for Interswitch transfer |
| `billAmount` | `Float` | What the hospital charged |
| `approvedAmount` | `Float?` | Capped at plan limit — what the pool pays |
| `billPhotoUrl` | `String?` | Cloudinary URL (added later) |
| `status` | `ClaimStatus` | See below |
| `interswitchRef` | `String?` | Interswitch payment reference |
| `otpVerified` | `Boolean` | Required for claims > ₦50,000 |
| `description` | `String?` | Diagnosis / notes |

**`ClaimStatus` flow:**

```
PENDING → APPROVED → PAID
                   ↘ FAILED (hospital transfer bounced — can retry for 24h)
        → REJECTED
```

> Claim create checks: member `status = ACTIVE`, waiting period elapsed, `coverageUsedThisYear + approvedAmount ≤ annual limit`, pool balance ≥ approvedAmount.
>
> On `PAID`: `Association.poolBalance` is decremented, `Member.coverageUsedThisYear` is incremented.

---

### `ClinicAdmin`
Clinic staff who look up patient coverage. Must log in via phone + OTP.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `userId` | `String` | FK → `User`, unique |
| `clinicName` | `String` | |

**Clinic Portal flow**: Enter patient phone number → system looks up `Member` by phone → returns `status`, plan tier, `coverageUsedThisYear`, and remaining coverage.

---

### `OtpCode`
Short-lived OTP for phone login. All user roles use the same table.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `phone` | `String` | |
| `code` | `String` | bcrypt-hashed 6-digit code |
| `expiresAt` | `DateTime` | 5 minutes from creation |
| `used` | `Boolean` | Invalidated after first use |

---

## Relationship Diagram

```
User ──────────────┬──▶ Association ──┬──▶ Member[] ──▶ Wallet
                   │                  ├──▶ Contribution[]
                   │                  └──▶ Claim[]
                   ├──▶ Member (optional, if user is also a member)
                   └──▶ ClinicAdmin

OtpCode (standalone — keyed on phone)
```

---

## Business Rules Summary

| Rule | Enforcement |
|---|---|
| No double-debit | Check `(memberId, week)` before firing Interswitch |
| Paused member can't claim | `ClaimService` checks `member.status` first — throws 403 |
| Waiting period enforced | Minor: 30 days, Major: 90 days from `waitingPeriodStart` |
| Annual coverage limit | `coverageUsedThisYear + approvedAmount ≤ plan annual limit` |
| Pool balance check | `poolBalance ≥ approvedAmount` before firing Payment Gateway |
| OTP expiry | `expiresAt` checked on verify — 5-minute window |
| Claim retry window | Failed hospital transfer can be retried within 24 hours |
