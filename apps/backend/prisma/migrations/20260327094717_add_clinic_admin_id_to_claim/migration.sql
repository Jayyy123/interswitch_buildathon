-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "clinicAdminId" TEXT;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_clinicAdminId_fkey" FOREIGN KEY ("clinicAdminId") REFERENCES "clinic_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
