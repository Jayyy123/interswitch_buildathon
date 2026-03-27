-- Migration: clinic_wallet_provisioning
-- Replaces manual bankAccount/bankCode fields with auto-provisioned Interswitch wallet fields

ALTER TABLE "clinics" DROP COLUMN IF EXISTS "bankAccount";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "bankCode";

ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "walletId" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "walletAccountNumber" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "walletBankName" TEXT DEFAULT 'Wema Bank';
