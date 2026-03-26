-- Add wallet/account fields to associations and members
-- These fields were added when the Interswitch merchant-wallet integration
-- was implemented (pool wallet per association, member individual wallets).

-- Associations: pool wallet for dues aggregation
ALTER TABLE "associations"
  ADD COLUMN "walletId"            TEXT,
  ADD COLUMN "walletAccountNumber" TEXT;

-- Members: individual Interswitch wallet + Wema Bank virtual account
ALTER TABLE "members"
  ADD COLUMN "walletId"            TEXT,
  ADD COLUMN "walletAccountNumber" TEXT;
