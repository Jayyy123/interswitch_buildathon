-- Add walletStatus and consecutiveMissedPayments to members table
-- walletStatus tracks the background wallet provisioning job state
-- consecutiveMissedPayments drives the 3-miss flagging rule

ALTER TABLE "members"
  ADD COLUMN "walletStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "consecutiveMissedPayments" INTEGER NOT NULL DEFAULT 0;
