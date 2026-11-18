-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "waylReferenceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_waylReferenceId_key" ON "Order"("waylReferenceId");

