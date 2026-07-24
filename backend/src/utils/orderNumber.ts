import { Prisma } from "@prisma/client";

const FIELD_BY_MODEL = {
  salesOrder: "orderNumber",
  purchaseOrder: "poNumber",
  invoice: "invoiceNumber",
} as const;

/** Generates the next sequential order/invoice number for a business, e.g. "SO-00042".
 * Derived from the highest existing numeric suffix (not a row count) so numbering never
 * collides after a record is deleted. Must be called inside the same transaction that
 * creates the record to minimize (not eliminate) race conditions. */
export async function nextSequenceNumber(
  tx: Prisma.TransactionClient,
  model: "salesOrder" | "purchaseOrder" | "invoice",
  businessId: string,
  prefix: string,
): Promise<string> {
  const field = FIELD_BY_MODEL[model];
  const rows = await (tx[model] as any).findMany({
    where: { businessId, [field]: { startsWith: `${prefix}-` } },
    select: { [field]: true },
  });

  const maxSeq = rows.reduce((max: number, row: Record<string, string>) => {
    const suffix = row[field].slice(prefix.length + 1);
    const n = parseInt(suffix, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `${prefix}-${String(maxSeq + 1).padStart(5, "0")}`;
}
