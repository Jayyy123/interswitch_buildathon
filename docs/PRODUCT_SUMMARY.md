# OmoHealth – Product Summary

> **Built for the Enyata Buildathon 2025 | Powered by Interswitch | Sector: Health**

---

## What Is It?

OmoHealth is a **community health pooling platform** for Nigeria's 93 million informal workers — market traders, artisans, domestic workers — who have zero access to HMOs or employer-sponsored insurance.

It works through **Iyaloja-led associations** (market unions, cooperatives). The Iyaloja (market union leader) manages the pool on behalf of her members. No app download required for members. No bank account required. Just a phone number and a BVN.

---

## How It Works

1. **Iyaloja onboards** her association (CAC number, selects a plan tier)
2. **Enrolls members** by uploading a CSV of BVNs → Interswitch BVN API looks up their phone numbers → wallets are created → members get an SMS
3. **Weekly contributions** are auto-debited from member wallets every Monday via Interswitch Direct Debit
4. **Claims**: Iyaloja selects a member, enters hospital + bill amount, uploads the bill photo → pool pays the hospital directly via Interswitch Payment Gateway
5. **Emergency levy**: if a claim exceeds the pool balance, Iyaloja triggers an SMS levy — members reply YES to contribute extra immediately

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
| **Iyaloja** | Admin — manages pool, members, claims, levies via web dashboard |
| **Member** | Passive — receives SMS notifications, can check status via a phone-accessible read-only view |
| **Clinic staff** | Looks up patient coverage by phone number via a Clinic Portal |

---

## Core Tech Stack (from product doc)

| Layer | Technology |
|---|---|
| Backend | NestJS + PostgreSQL (Supabase) + Prisma |
| Frontend | React (Vite) |
| Payments | **Interswitch** — Direct Debit, Payment Gateway, BVN API, Safe Token OTP |
| SMS | Termii |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Interswitch APIs Used

| API | Purpose |
|---|---|
| **BVN Lookup** | Resolve member phone number from BVN on enrollment |
| **Wallet / Direct Debit** | Create member wallets; auto-debit weekly contributions |
| **Payment Gateway** | Pay hospital directly when a claim is approved |
| **Safe Token OTP** | Confirm large claims (>₦50,000) |
| **ILS Bridge Loan** | If pool balance is insufficient, ILS advances the shortfall — repaid from the following Monday's contributions |

---

## Key Features (Backend Priority)

- [ ] Association + Iyaloja auth (OTP login via phone)
- [ ] Member enrollment via CSV → BVN lookup → wallet creation
- [ ] Weekly contribution cron job (Monday auto-debit)
- [ ] Claim submission + approval + hospital payment flow
- [ ] Emergency levy (SMS blast → YES reply → instant debit)
- [ ] Pool balance tracking & coverage limit enforcement
- [ ] Manual cash contribution recording
- [ ] Clinic Portal — phone lookup for coverage check

---

## Edge Cases to Handle

- Interswitch API timeout → retry 3× with exponential backoff, log as `pending`, never double-debit
- Duplicate BVNs in CSV → deduplicate before processing
- Claim for paused member → 403: "Coverage paused. Reinstate first."
- Pool insufficient for claim → ILS bridge loan covers shortfall
- Member opts out (SMS STOP) → paused, no debits; SMS START reactivates (waiting period does NOT restart)
- Hospital payment fails → claim stays `approved`, not `paid`; Iyaloja can update account + retry within 24h
- Member in multiple associations → separate wallet + coverage per association (stacks independently)

---

## Demo Flow (Hackathon Pitch — 5 min)

| Time | Action |
|---|---|
| 0:00–0:30 | Opening pitch on the problem |
| 0:30–1:30 | Iyaloja uploads 5 BVNs → wallets created → onboarding SMS arrives |
| 1:30–2:30 | Dashboard: ₦1.24M pool, 8 covered members |
| 2:30–4:00 | Claim flow: ₦85,000 bill → Safe Token OTP → Approve → SMS to member |
| 4:00–5:00 | Emergency levy: ₦300K surgery, pool covers ₦150K, levy ₦500/member, YES replies flow in |
