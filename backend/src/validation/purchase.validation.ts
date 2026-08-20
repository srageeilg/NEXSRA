import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantityOrdered: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: z.coerce.number().min(0).max(100).default(13),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    items: z.array(purchaseItemSchema).min(1),
    discountTotal: z.coerce.number().nonnegative().default(0),
    expectedDate: z.coerce.date().optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const receiveGoodsSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          itemId: z.string().uuid(),
          quantityReceived: z.coerce.number().int().positive(),
        }),
      )
      .min(1),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const listPurchaseOrdersQuerySchema = z.object({
  query: z.object({
    status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).optional(),
    supplierId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
