-- OmoHealth — Initial Schema Migration
-- Creates all enums and tables from scratch.
-- Run via: pnpm run prisma:migrate  (local dev)
--           prisma migrate deploy    (CI/CD)

-- ── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('IYALOJA', 'MEMBER', 'CLINIC_ADMIN');
CREATE TYPE "PlanTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FLAGGED', 'INCOMPLETE');
CREATE TYPE "ContributionSource" AS ENUM ('DIRECT_DEBIT', 'CASH');
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'FAILED');

-- ── users ────────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"        TEXT         NOT NULL,
  "phone"     TEXT         NOT NULL,
  "role"      "UserRole"   NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- ── otp_codes ────────────────────────────────────────────────────────────────

CREATE TABLE "otp_codes" (
  "id"        TEXT         NOT NULL,
  "phone"     TEXT         NOT NULL,
  "code"      TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used"      BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- ── associations ──────────────────────────────────────────────────────────────

CREATE TABLE "associations" (
  "id"              TEXT             NOT NULL,
  "userId"          TEXT             NOT NULL,
  "name"            TEXT             NOT NULL,
  "cacNumber"       TEXT,
  "plan"            "PlanTier"       NOT NULL DEFAULT 'BRONZE',
  "monthlyDues"     DOUBLE PRECISION,
  "coverageLimit"   DOUBLE PRECISION,
  "poolBalance"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "anniversaryDate" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "associations_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "associations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "associations_userId_key" ON "associations"("userId");

-- ── members ───────────────────────────────────────────────────────────────────

CREATE TABLE "members" (
  "id"                   TEXT           NOT NULL,
  "userId"               TEXT,
  "associationId"        TEXT           NOT NULL,
  "bvn"                  TEXT           NOT NULL,
  "phone"                TEXT           NOT NULL,
  "name"                 TEXT,
  "status"               "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "coverageUsedThisYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "optOut"               BOOLEAN        NOT NULL DEFAULT false,
  "waitingPeriodStart"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enrolledAt"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)   NOT NULL,

  CONSTRAINT "members_pkey"               PRIMARY KEY ("id"),
  CONSTRAINT "members_userId_fkey"        FOREIGN KEY ("userId")        REFERENCES "users"("id")        ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "members_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "members_userId_key"             ON "members"("userId");
CREATE UNIQUE INDEX "members_associationId_bvn_key" ON "members"("associationId", "bvn");

-- ── wallets ───────────────────────────────────────────────────────────────────

CREATE TABLE "wallets" (
  "id"             TEXT          NOT NULL,
  "memberId"       TEXT          NOT NULL,
  "interswitchRef" TEXT          NOT NULL,
  "balance"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wallets_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "wallets_memberId_fkey"  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wallets_memberId_key"       ON "wallets"("memberId");
CREATE UNIQUE INDEX "wallets_interswitchRef_key" ON "wallets"("interswitchRef");

-- ── contributions ─────────────────────────────────────────────────────────────

CREATE TABLE "contributions" (
  "id"             TEXT                  NOT NULL,
  "memberId"       TEXT                  NOT NULL,
  "associationId"  TEXT                  NOT NULL,
  "amount"         DOUBLE PRECISION      NOT NULL,
  "source"         "ContributionSource"  NOT NULL DEFAULT 'DIRECT_DEBIT',
  "status"         "ContributionStatus"  NOT NULL DEFAULT 'PENDING',
  "interswitchRef" TEXT,
  "week"           TIMESTAMP(3)          NOT NULL,
  "createdAt"      TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contributions_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "contributions_memberId_fkey"    FOREIGN KEY ("memberId")      REFERENCES "members"("id")      ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contributions_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── claims ────────────────────────────────────────────────────────────────────
-- NOTE: hospitalBankCode column is added by migration 20260326000001

CREATE TABLE "claims" (
  "id"              TEXT          NOT NULL,
  "associationId"   TEXT          NOT NULL,
  "memberId"        TEXT          NOT NULL,
  "hospitalName"    TEXT          NOT NULL,
  "hospitalAccount" TEXT,
  "billAmount"      DOUBLE PRECISION NOT NULL,
  "approvedAmount"  DOUBLE PRECISION,
  "billPhotoUrl"    TEXT,
  "status"          "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "interswitchRef"  TEXT,
  "otpVerified"     BOOLEAN       NOT NULL DEFAULT false,
  "description"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "claims_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "claims_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "claims_memberId_fkey"    FOREIGN KEY ("memberId")      REFERENCES "members"("id")      ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── clinic_admins ─────────────────────────────────────────────────────────────

CREATE TABLE "clinic_admins" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "clinicName" TEXT NOT NULL,

  CONSTRAINT "clinic_admins_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "clinic_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "clinic_admins_userId_key" ON "clinic_admins"("userId");
