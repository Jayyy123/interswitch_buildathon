/*
  Warnings:

  - You are about to drop the column `address` on the `clinic_admins` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccount` on the `clinic_admins` table. All the data in the column will be lost.
  - You are about to drop the column `bankCode` on the `clinic_admins` table. All the data in the column will be lost.
  - You are about to drop the column `clinicName` on the `clinic_admins` table. All the data in the column will be lost.
  - Added the required column `clinicId` to the `clinic_admins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "clinicId" TEXT;

-- AlterTable
ALTER TABLE "clinic_admins" DROP COLUMN "address",
DROP COLUMN "bankAccount",
DROP COLUMN "bankCode",
DROP COLUMN "clinicName",
ADD COLUMN     "clinicId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "bankAccount" TEXT,
    "bankCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_admins" ADD CONSTRAINT "clinic_admins_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
