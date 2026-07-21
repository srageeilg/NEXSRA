import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    parentId: z.string().uuid().nullable().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: createCategorySchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
  }),
});

export const updateBrandSchema = z.object({
  body: createBrandSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const createUnitSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(60),
    shortCode: z.string().min(1).max(10),
  }),
});

const productVariantSchema = z.object({
  sku: z.string().min(1).max(80),
  barcode: z.string().max(80).optional(),
  color: z.string().max(60).optional(),
  size: z.string().max(60).optional(),
  weight: z.coerce.number().nonnegative().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  sellingPrice: z.coerce.number().nonnegative().optional(),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    sku: z.string().max(80).optional(),
    barcode: z.string().max(80).optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    manufacturerId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    taxId: z.string().uuid().optional(),
    purchasePrice: z.coerce.number().nonnegative().default(0),
    sellingPrice: z.coerce.number().nonnegative().default(0),
    wholesalePrice: z.coerce.number().nonnegative().optional(),
    minimumPrice: z.coerce.number().nonnegative().optional(),
    lowStockThreshold: z.coerce.number().int().nonnegative().default(10),
    trackExpiry: z.coerce.boolean().default(false),
    trackSerial: z.coerce.boolean().default(false),
    trackBatch: z.coerce.boolean().default(false),
    notes: z.string().max(2000).optional(),
    isActive: z.coerce.boolean().default(true),
    variants: z.array(productVariantSchema).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const listProductsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    isActive: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    sortBy: z.enum(["name", "createdAt", "sellingPrice"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});
