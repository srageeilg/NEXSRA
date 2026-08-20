-- AlterTable
ALTER TABLE "journal_entries"
ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
ADD COLUMN IF NOT EXISTS "sourceType" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders"
ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.13;

-- AlterTable
ALTER TABLE "sales_orders"
ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.13;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_businessId_sourceType_sourceId_key" ON "journal_entries"("businessId", "sourceType", "sourceId");
