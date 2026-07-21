import { z } from "zod";

export const recordPaymentSchema = z.object({
  body: z
    .object({
      direction: z.enum(["INBOUND", "OUTBOUND"]),
      method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "CHEQUE", "STORE_CREDIT", "OTHER"]),
      amount: z.coerce.number().positive(),
      reference: z.string().max(120).optional(),
      notes: z.string().max(500).optional(),
      customerId: z.string().uuid().optional(),
      supplierId: z.string().uuid().optional(),
      invoiceId: z.string().uuid().optional(),
      purchaseOrderId: z.string().uuid().optional(),
    })
    .refine((data) => data.customerId || data.supplierId, {
      message: "A payment must be linked to a customer or a supplier",
    }),
});

export const listPaymentsQuerySchema = z.object({
  query: z.object({
    direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
    customerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
