-- AddColumn hospitalBankCode to claims table
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "hospitalBankCode" TEXT;
