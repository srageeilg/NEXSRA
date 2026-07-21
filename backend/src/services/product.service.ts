import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { generateBarcodeValue, generateSku } from "../utils/codeGenerators";

interface ProductVariantInput {
  sku: string;
  barcode?: string;
  color?: string;
  size?: string;
  weight?: number;
  purchasePrice?: number;
  sellingPrice?: number;
}

interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  manufacturerId?: string;
  unitId?: string;
  taxId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minimumPrice?: number;
  lowStockThreshold: number;
  trackExpiry: boolean;
  trackSerial: boolean;
  trackBatch: boolean;
  notes?: string;
  isActive: boolean;
  variants?: ProductVariantInput[];
}

async function ensureUniqueSku(businessId: string, sku: string): Promise<string> {
  let candidate = sku;
  let attempt = 0;
  while (await prisma.product.findFirst({ where: { businessId, sku: candidate } })) {
    attempt += 1;
    candidate = `${sku}-${attempt}`;
  }
  return candidate;
}

export async function listProducts(
  businessId: string,
  params: {
    page: number;
    pageSize: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
    sortBy: "name" | "createdAt" | "sellingPrice";
    sortOrder: "asc" | "desc";
  },
) {
  const where: Prisma.ProductWhereInput = {
    businessId,
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.brandId && { brandId: params.brandId }),
    ...(params.isActive !== undefined && { isActive: params.isActive }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { sku: { contains: params.search, mode: "insensitive" } },
        { barcode: { contains: params.search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, shortCode: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, isPrimary: true, sortOrder: true } },
        stocks: { select: { quantity: true } },
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const withStockTotals = items.map((p) => ({
    ...p,
    totalStock: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
  }));

  return {
    items: withStockTotals,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getProductById(businessId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      brand: true,
      unit: true,
      tax: true,
      supplier: true,
      manufacturer: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      stocks: { include: { warehouse: true } },
      batches: true,
    },
  });
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

export async function createProduct(businessId: string, input: CreateProductInput) {
  const sku = await ensureUniqueSku(businessId, input.sku?.trim() || generateSku(input.name));
  const barcode = input.barcode?.trim() || generateBarcodeValue();

  const { variants, ...productData } = input;

  return prisma.product.create({
    data: {
      ...productData,
      businessId,
      sku,
      barcode,
      qrCode: sku,
      hasVariants: Boolean(variants && variants.length > 0),
      variants: variants
        ? {
            create: variants.map((v) => ({
              ...v,
              barcode: v.barcode?.trim() || generateBarcodeValue(),
            })),
          }
        : undefined,
    },
    include: { variants: true, images: true },
  });
}

export async function updateProduct(businessId: string, id: string, input: Partial<CreateProductInput>) {
  const existing = await prisma.product.findFirst({ where: { id, businessId } });
  if (!existing) throw ApiError.notFound("Product not found");

  const { variants: _variants, ...rest } = input;

  return prisma.product.update({
    where: { id },
    data: rest,
    include: { variants: true, images: true },
  });
}

export async function deactivateProduct(businessId: string, id: string) {
  const existing = await prisma.product.findFirst({ where: { id, businessId } });
  if (!existing) throw ApiError.notFound("Product not found");
  await prisma.product.update({ where: { id }, data: { isActive: false } });
}

export async function addProductImage(businessId: string, productId: string, url: string, isPrimary: boolean) {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) throw ApiError.notFound("Product not found");

  if (isPrimary) {
    await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
  }

  return prisma.productImage.create({ data: { productId, url, isPrimary } });
}

export async function removeProductImage(businessId: string, productId: string, imageId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) throw ApiError.notFound("Product not found");
  await prisma.productImage.delete({ where: { id: imageId } });
}
