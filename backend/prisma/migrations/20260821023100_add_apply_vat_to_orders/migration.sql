-- AlterTable
ALTER TABLE "purchase_orders"
ADD COLUMN IF NOT EXISTS "applyVat" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sales_orders"
ADD COLUMN IF NOT EXISTS "applyVat" BOOLEAN NOT NULL DEFAULT true;
