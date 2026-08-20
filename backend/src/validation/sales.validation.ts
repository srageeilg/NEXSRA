import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: z.coerce.number().min(0).max(100).default(13),
});

export const createSalesOrderSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    warehouseId: z.string().uuid(),
    items: z.array(orderItemSchema).min(1),
    applyVat: z.coerce.boolean().default(true),
    discountTotal: z.coerce.number().nonnegative().default(0),
    notes: z.string().max(1000).optional(),
    couponCode: z.string().max(60).optional(),
  }),
});

export const posCheckoutSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    warehouseId: z.string().uuid(),
    items: z.array(orderItemSchema).min(1),
    applyVat: z.coerce.boolean().default(true),
    discountTotal: z.coerce.number().nonnegative().default(0),
    payments: z
      .array(
        z.object({
          method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "CHEQUE", "STORE_CREDIT", "OTHER"]),
          amount: z.coerce.number().positive(),
          reference: z.string().max(120).optional(),
        }),
      )
      .min(1),
    requiresVcts: z.coerce.boolean().default(false),
    vehicleNumber: z.string().max(20).optional(),
  }),
});

export const listSalesOrdersQuerySchema = z.object({
  query: z.object({
    status: z.enum(["DRAFT", "CONFIRMED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"]).optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
