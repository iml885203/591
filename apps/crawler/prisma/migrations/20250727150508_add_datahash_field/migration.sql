-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "dataHash" TEXT;

-- CreateIndex
CREATE INDEX "rentals_dataHash_idx" ON "rentals"("dataHash");

-- CreateIndex
CREATE INDEX "rentals_propertyId_dataHash_idx" ON "rentals"("propertyId", "dataHash");
