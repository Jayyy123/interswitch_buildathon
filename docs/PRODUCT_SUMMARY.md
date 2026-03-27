# OmoHealth – Product Summary

> **Built for the Enyata Buildathon 2025 | Powered by Interswitch | Sector: Health**

---

## What Is It?

OmoHealth is a **community health pooling platform** for Nigeria's 93 million informal workers — market traders, artisans, domestic workers — who have zero access to HMOs or employer-sponsored insurance.

It works through **Iyaloja (association admin)-led associations** (market unions, cooperatives). The Iyaloja manages the pool on behalf of her members. No app download required for members. No bank account required. Just a phone number and a BVN.

---

## How It Works

1. **Iyaloja onboards** her association (association name, optional CAC number, selects a plan tier)
2. **Enrolls members** by uploading a CSV of BVNs → Interswitch BVN API looks up their phone numbers → wallets are created asynchronously (via BullMQ) → members get an SMS
3. **Weekly contributions** are auto-debited from member wallets every Monday via Interswitch Direct Debit (BullMQ scheduler)
4. **Claims**: Iyaloja selects a member, enters hospital + bill amount → Association pool pays the hospital directly via Interswitch Payment Gateway. Clinic admins can also submit claims on behalf of patients through the **Clinic Portal**

---

## Plan Tiers

| Tier | Weekly Contribution | Annual Coverage | Pool Cap per Claim |
|---|---|---|---|
| Bronze | ₦500 | ₦100,000 | ₦75,000 |
| Silver | ₦1,000 | ₦150,000 | ₦100,000 |
| Gold | ₦2,000 | ₦300,000 | ₦200,000 |

- **Waiting period**: 30 days for minor claims, 90 days for major claims after enrollment
- **Coverage resets** on the association's anniversary date each year

---

## Key Actors

| Actor | Role |
|---|---|
| **Iyaloja (association admin)** | Admin — manages pool, members, claims, levies via web dashboard |
| **Member** | Passive — receives SMS notifications; can opt out via SMS `STOP` |
| **Clinic Admin** | Looks up patient coverage by phone number and submits claims via the Clinic Portal |

---

## Core Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + PostgreSQL + Prisma 7 |
| Async Jobs | BullMQ + Redis (wallet provisioning & weekly scheduler) |
| Frontend | Next.js 16 PWA (Tailwind CSS v4, shadcn/ui) |
| Payments | **Interswitch** — Direct Debit, Payment Gateway, BVN API, Safe Token OTP |
| SMS | Termii (OTP delivery + rich notification templates + inbound keyword handling) |
| Deploy | Railway (backend + DB + Redis) + Vercel (frontend) + Cloudflare Worker (ISW proxy) |

---

## Interswitch APIs Used

| API | Purpose |
|---|---|
| **BVN Lookup** | Resolve member name and phone number from BVN on enrollment |
| **Wallet / Direct Debit** | Create member and association wallets; auto-debit weekly contributions |
| **Payment Gateway** | Pay hospital directly when a claim is approved |
| **Safe Token OTP** | Confirm large claims (> ₦50,000) before payment |
| **ILS Bridge Loan** | If pool balance is insufficient, ILS advances the shortfall — repaid from the following Monday's contributions |

---

## Database Schema (Summary)

The schema has **9 models** across 3 user roles:

| Model | Description |
|---|---|
| `User` | Central auth table — phone + OTP login; role = `IYALOJA` / `MEMBER` / `CLINIC_ADMIN` |
| `OtpCode` | Short-lived bcrypt-hashed 6-digit codes; 5-minute expiry |
| `Association` | Health pool owned by one Iyaloja; stores `poolBalance`, `plan`, `walletId`, `walletAccountNumber` |
| `Member` | A person enrolled in an association; linked to BVN, wallet, and coverage tracking |
| `Wallet` | Interswitch wallet for a member — used for auto-debit |
| `Contribution` | One row per weekly debit or manual cash entry — tracks money **in** to the pool |
| `Claim` | Hospital payout request — tracks money **out** of the pool |
| `Clinic` | A clinic institution with bank payout details |
| `ClinicAdmin` | A clinic staff user who can look up coverage and submit claims |

See [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) for the full field-level documentation.

---

## Key Features — Implementation Status

- [x] Association + Iyaloja auth (OTP login via phone, Termii SMS)
- [x] Member enrollment via CSV → BVN lookup → async wallet creation (BullMQ)
- [x] 3-tier Interswitch wallet architecture (pool wallet, Iyaloja wallet, member wallet)
- [x] Weekly contribution cron job (Monday auto-debit via BullMQ scheduler)
- [x] Claim submission + Iyaloja approval + hospital payment (Interswitch Payment Gateway)
- [x] Pool balance tracking & annual coverage limit enforcement per member
- [x] Manual cash contribution recording
- [x] Clinic Portal — phone lookup for coverage check + claim submission
- [x] Safe Token OTP confirmation for large claims (> ₦50,000)
- [x] SMS inbound keyword handling (STOP, STATUS, HELP, BALANCE via Termii webhook)
- [x] Rich SMS notification templates (enrollment, contribution success/failure, claim paid)
- [x] Cloudflare Worker proxy for Interswitch traffic (Railway → UK IP bypass)
- [x] Full Next.js 16 PWA with Iyaloja Portal, Member view, and Clinic Portal
- [x] Production Docker Compose stack + multi-stage Dockerfiles
- [x] E2E test suite for enrollment → wallet → contribution → claim flow