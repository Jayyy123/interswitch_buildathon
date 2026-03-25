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
├── docker-compose.yml
└── docs/
    ├── DATABASE_SCHEMA.md
    └── PRODUCT_SUMMARY.md
```

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

> `DATABASE_URL` is automatically overridden by Docker Compose — you don't need to change it.

### 2. Start the stack

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
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

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, TypeScript, Prisma 7, PostgreSQL |
| Auth | JWT, Passport, bcrypt, phone OTP |
| Payments | Interswitch APIs (BVN, Direct Debit, Gateway, Safe Token) |
| Frontend | Next.js 16, Tailwind CSS v4, shadcn/ui |
| Infra | Docker Compose, pnpm workspaces |

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/send-otp` | Send OTP to phone number |
| `POST` | `/auth/verify-otp` | Verify OTP, receive JWT |
| `GET` | `/payments/claims` | List claims (authenticated) |
| `PATCH` | `/payments/claims/:id/approve` | Approve a claim (Iyaloja) |

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
