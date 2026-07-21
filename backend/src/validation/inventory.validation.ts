import { z } from "zod";

export const createWarehouseSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    code: z.string().min(1).max(30),
    branchId: z.string().uuid().optional(),
    address: z.string().max(300).optional(),
  }),
});

export const updateWarehouseSchema = z.object({
  body: createWarehouseSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

const stockMutationBase = {
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  warehouseId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive(),
  reference: z.string().max(120).optional(),
  reason: z.string().max(300).optional(),
};

export const stockInSchema = z.object({
  body: z.object({ ...stockMutationBase, unitCost: z.coerce.number().nonnegative().optional() }),
});

export const stockOutSchema = z.object({
  body: z.object(stockMutationBase),
});

export const damagedReturnedSchema = z.object({
  body: z.object(stockMutationBase),
});

export const transferStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    fromWarehouseId: z.string().uuid(),
    toWarehouseId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    reference: z.string().max(120).optional(),
    reason: z.string().max(300).optional(),
  }),
});

export const adjustmentSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    warehouseId: z.string().uuid(),
    batchId: z.string().uuid().optional(),
    newQuantity: z.coerce.number().int().nonnegative(),
    reason: z.string().min(1).max(300),
  }),
});

export const listStockQuerySchema = z.object({
  query: z.object({
    warehouseId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    lowStockOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const listMovementsQuerySchema = z.object({
  query: z.object({
    productId: z.string().uuid().optional(),
    warehouseId: z.string().uuid().optional(),
    type: z
      .enum([
        "STOCK_IN",
        "STOCK_OUT",
        "TRANSFER",
        "ADJUSTMENT",
        "DAMAGED",
        "RETURNED",
        "SALE",
        "PURCHASE",
        "SALE_RETURN",
        "PURCHASE_RETURN",
      ])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(30),
  }),
});
