-- AlterTable
ALTER TABLE "PremiumPeriod" ADD COLUMN     "endedEarlyAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT,
ALTER COLUMN "planId" DROP NOT NULL;

