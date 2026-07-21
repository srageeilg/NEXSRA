import { Prisma } from "@prisma/client";

/** Generates the next sequential order/invoice number for a business, e.g. "SO-00042". Must be called inside the same transaction that creates the record to minimize (not eliminate) race conditions. */
export async function nextSequenceNumber(
  tx: Prisma.TransactionClient,
  model: "salesOrder" | "purchaseOrder" | "invoice",
  businessId: string,
  prefix: string,
): Promise<string> {
  let count: number;
  switch (model) {
    case "salesOrder":
      count = await tx.salesOrder.count({ where: { businessId } });
      break;
    case "purchaseOrder":
      count = await tx.purchaseOrder.count({ where: { businessId } });
      break;
    case "invoice":
      count = await tx.invoice.count({ where: { businessId } });
      break;
  }
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}
