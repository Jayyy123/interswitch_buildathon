# OmoHealth

> **Enyata Buildathon 2025** — Community health pooling platform for informal workers.

OmoHealth enables market associations (led by an *Iyaloja*) to pool weekly contributions from members into a shared health fund. When a member needs medical care, the association covers their hospital bills up to their plan cap. The platform handles member enrolment via BVN lookup, weekly direct debit contributions through Interswitch, claim approvals, and OTP-authenticated access for members, association leaders, and clinic staff.

---

## Project Structure

```
interswitch_buildathon/
├── apps/
│   ├── backend/   # NestJS API (port 3000)
│   └── ui/        # Next.js 16 PWA (port 3001)
├── cloudflare/    # Cloudflare Worker proxy for Interswitch
├── docker-compose.yml
└── docs/
    ├── DATABASE_SCHEMA.md
    └── PRODUCT_SUMMARY.md
```

---

## Team Contributions

> All contributors can be verified against the [Git commit history](https://github.com/Jayyy123/interswitch_buildathon/commits/main).

---

### Joseph Ofili — Backend Engineer & DevOps Lead
**GitHub:** [@Jayyy123](https://github.com/Jayyy123) · **Email:** josephofilii@gmail.com

**Technical Contributions:**
- Architected and built the entire NestJS backend from scratch (`apps/backend/`)
- Implemented phone + OTP authentication (JWT, Passport, bcrypt, Termii SMS delivery)
- Built the full Interswitch integration: BVN lookup, 3-tier merchant wallet architecture (pool / Iyaloja / member), Direct Debit scheduling, Payment Gateway payouts, Safe Token OTP for large claims
- Designed the PostgreSQL schema (Prisma 7) — all 9 models: `User`, `OtpCode`, `Association`, `Member`, `Wallet`, `Contribution`, `Claim`, `Clinic`, `ClinicAdmin`
- Built BullMQ async job queues for wallet provisioning (`wallet-provision` module) and the Monday auto-debit scheduler (`scheduler` module)
- Overhauled the SMS system with rich Termii templates and an inbound keyword webhook (STOP, STATUS, HELP, BALANCE)
- Built and configured a **Cloudflare Worker proxy** (`cloudflare/isw-proxy-worker.js`) to route Interswitch traffic through a UK IP address, bypassing Railway's IP-based firewall restriction
- Created production-ready multi-stage Dockerfiles for both the backend and UI
- Deployed backend to Railway (PostgreSQL + Redis); deployed UI to Vercel
- Added `isNewUser` / `hasSetup` flags to auth flow; built role-aware `GET /associations`
- Maintained monorepo tooling: `docker-compose.yml`, pnpm workspaces, `commitlint`, Husky hooks, `.prettierrc`
- Authored the E2E test suite (`apps/backend/test/e2e-api.js`) covering the full enrollment → wallet-provisioning → contribution → claim flow

**Non-Technical Contributions:**
- Defined overall system architecture and technology stack
- Led technical scoping and sprint planning across the team
- Reviewed and merged all backend-related PRs throughout the buildathon

---

### Uchechukwu Nwafor — Frontend Engineer (PWA)
**GitHub:** [@webdott](https://github.com/webdott) · **Email:** nwaforuchechukwu2007@gmail.com

**Technical Contributions:**
- Initialized the monorepo repository structure and pushed the first commit (`chore: repo init`)
- Built the entire Next.js 16 PWA (`apps/ui/`) from scratch with Tailwind CSS v4 and shadcn/ui
- Implemented all three user-facing portal flows: **Iyaloja Portal**, **Member view**, **Clinic Portal**
- Created all UI components: `AssociationHub`, `MemberManagementTable`, `ClaimsManagementTable`, `TransactionsManagementTable`, `EnrollMembersSection`, `AssociationClaimDetail`, `ClinicPortalShell`, `PortalShell`, `StatCard`, `SectionCard`, `StatusBadge`, `LoginForm`, `SignupForm`, `OnboardingSaveLink`
- Implemented route-based auth with Next.js middleware, `AuthContext`, and client-side session management
- Wired all frontend pages to live backend APIs — auth, associations, members, claims, contributions, wallet, and clinic
- Built role-aware routing (`portal-role.ts`) and `AssociationAccessGuard`
- Identified and built missing backend endpoints needed by the UI (e.g., association detail, member detail)
- Configured PWA manifest, favicons, and the offline fallback page
- Added `vercel.json` for correct monorepo rootDirectory scoping on Vercel
- Set up development Dockerfiles (`Dockerfile.dev`) for both backend and UI workspaces

**Non-Technical Contributions:**
- Designed the overall UX flow and page layout for all three user roles
- Aligned UI component structure with business rules (waiting periods, coverage caps, claim status flows)

---

### Abdulmateen Tairu — Full-Stack Engineer (Clinic Module)
**GitHub:** [@Taycode](https://github.com/Taycode) · **Email:** tay2druh@gmail.com

**Technical Contributions:**
- Built the complete **Clinic backend module** (`apps/backend/src/clinic/`) — `Clinic` and `ClinicAdmin` Prisma models, controller, service, and DTOs
- Authored 3 Prisma migration files for the clinic feature: `add_clinic_admin_fields`, `add_clinic_admin_id_to_claim`, `refactor_clinic_clinic_admin`
- Extended the `Claim` model with `clinicId`, `clinicAdminId`, and `hospitalBankCode` to support clinic-portal-submitted claims
- Extended `ClaimsService` and `ClaimsController` with clinic-side submission endpoints
- Built the Payout module (`apps/backend/src/payouts/`) with BullMQ processor for async hospital transfer jobs
- Built all clinic frontend pages: `clinic/register`, `clinic/[id]`, `clinic/[id]/setup`, `clinic/[id]/claims/new`, `clinic/[id]/claims`
- Created `ClinicPortalShell` component and a clinic-specific `ClaimsManagementTable`
- Extended `api.types.ts` with full type definitions for clinic entities

**Non-Technical Contributions:**
- Wrote the initial README (`chore: readme update`)
- Reviewed and merged frontend PRs; co-managed repository access and PR flow
- Contributed product design input on the clinic coverage-lookup UX

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required)
- [Node.js 20.19+](https://nodejs.org/) + [pnpm](https://pnpm.io/) — only needed if running outside Docker

### 1. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and fill in your secrets:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Any long random string |
| `INTERSWITCH_CLIENT_ID` | From Interswitch sandbox dashboard |
| `INTERSWITCH_SECRET_KEY` | From Interswitch sandbox dashboard |
| `TERMII_API_KEY` | For SMS OTP delivery (optional in dev) |
| `REDIS_URL` | Redis connection string (for BullMQ queues) |

> `DATABASE_URL` is automatically overridden by Docker Compose — you don't need to change it.

### 2. Start the stack

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379` (for BullMQ job queues)
- **Backend API** on port `3000` (hot reload — `nest start --watch`)
- **UI** on port `3001` (hot reload — `next dev`)

Prisma migrations run automatically on backend startup.

### 3. Stop

```bash
docker compose down
```

To also wipe the database volume:

```bash
docker compose down -v
```

---

## Running Without Docker

```bash
# Install dependencies
pnpm install

# Start Postgres separately, then:
cd apps/backend
pnpm run start:dev   # backend on :3000

cd apps/ui
pnpm run dev         # UI on :3001 (or next available port)
```

---

## Live Deployments

| Service | Platform |
|---|---|
| Backend API | Railway (PostgreSQL + Redis included) |
| Frontend PWA | Vercel |
| Interswitch Proxy | Cloudflare Worker (`cloudflare/isw-proxy-worker.js`) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, TypeScript, Prisma 7, PostgreSQL |
| Auth | JWT, Passport, bcrypt, phone OTP (Termii) |
| Payments | Interswitch APIs (BVN, Direct Debit, Gateway, Safe Token) |
| Async Jobs | BullMQ + Redis (wallet provisioning & weekly scheduler) |
| Frontend | Next.js 16, Tailwind CSS v4, shadcn/ui |
| Infra | Docker Compose, pnpm workspaces, Cloudflare Worker proxy |
| Deploy | Railway (backend + DB) · Vercel (frontend) |

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/send-otp` | Send OTP to phone number |
| `POST` | `/auth/verify-otp` | Verify OTP, receive JWT |
| `POST` | `/associations` | Create association (Iyaloja signup) |
| `GET` | `/associations` | List associations (role-aware) |
| `GET` | `/associations/:id` | Get association detail |
| `POST` | `/members/enroll` | Enroll members via BVN CSV |
| `GET` | `/members` | List members in association |
| `POST` | `/payments/claims` | Submit a claim |
| `GET` | `/payments/claims` | List claims (authenticated) |
| `PATCH` | `/payments/claims/:id/approve` | Approve a claim (Iyaloja) |
| `POST` | `/clinic/register` | Register clinic + clinic admin |
| `GET` | `/clinic/:id` | Get clinic detail |
| `POST` | `/clinic/:id/claims` | Submit claim via clinic portal |
| `POST` | `/termii/inbound` | Inbound SMS webhook (STOP / STATUS / HELP) |

---

## Commit Message Format

This repo enforces **Conventional Commits** via commitlint.

```
type(scope): subject
```

**Examples:**
- `feat(ui): add member csv upload preview`
- `fix(backend): handle claim status transition`
- `chore(repo): update lint-staged config`

**Allowed types:** `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

**Rules:** lowercase subject · no space before `(` · max 100 chars
