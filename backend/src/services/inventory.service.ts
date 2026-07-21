import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export interface StockKey {
  productId: string;
  variantId?: string | null;
  warehouseId: string;
  batchId?: string | null;
}

async function findStockRow(tx: Prisma.TransactionClient, key: StockKey) {
  return tx.stock.findFirst({
    where: {
      productId: key.productId,
      variantId: key.variantId ?? null,
      warehouseId: key.warehouseId,
      batchId: key.batchId ?? null,
    },
  });
}

/** Applies a signed quantity delta to a stock row, creating it if absent. Throws if the result would go negative.
 * Exported so purchase/sales services can mutate stock atomically within their own domain transaction. */
export async function applyStockDelta(tx: Prisma.TransactionClient, key: StockKey, delta: number) {
  const existing = await findStockRow(tx, key);
  const currentQty = existing?.quantity ?? 0;
  const nextQty = currentQty + delta;

  if (nextQty < 0) {
    throw ApiError.badRequest("Insufficient stock for this operation");
  }

  if (existing) {
    return tx.stock.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  }
  return tx.stock.create({
    data: {
      productId: key.productId,
      variantId: key.variantId ?? null,
      warehouseId: key.warehouseId,
      batchId: key.batchId ?? null,
      quantity: nextQty,
    },
  });
}

async function assertProductBelongsToBusiness(businessId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) throw ApiError.notFound("Product not found");
}

async function assertWarehouseBelongsToBusiness(businessId: string, warehouseId: string) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");
}

interface StockMutationInput {
  productId: string;
  variantId?: string;
  warehouseId: string;
  batchId?: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  reason?: string;
  performedById?: string;
}

/** direction: "IN" records the warehouse as the destination, "OUT" records it as the source. */
async function recordMovement(
  businessId: string,
  input: StockMutationInput,
  type: StockMovementType,
  signedQuantity: number,
  direction: "IN" | "OUT",
) {
  await assertProductBelongsToBusiness(businessId, input.productId);
  await assertWarehouseBelongsToBusiness(businessId, input.warehouseId);

  return prisma.$transaction(async (tx) => {
    await applyStockDelta(
      tx,
      { productId: input.productId, variantId: input.variantId, warehouseId: input.warehouseId, batchId: input.batchId },
      signedQuantity,
    );

    return tx.stockMovement.create({
      data: {
        businessId,
        productId: input.productId,
        variantId: input.variantId,
        batchId: input.batchId,
        type,
        quantity: input.quantity,
        unitCost: input.unitCost,
        reference: input.reference,
        reason: input.reason,
        performedById: input.performedById,
        fromWarehouseId: direction === "OUT" ? input.warehouseId : undefined,
        toWarehouseId: direction === "IN" ? input.warehouseId : undefined,
      },
    });
  });
}

export async function stockIn(businessId: string, input: StockMutationInput) {
  return recordMovement(businessId, input, "STOCK_IN", input.quantity, "IN");
}

export async function stockOut(businessId: string, input: StockMutationInput) {
  return recordMovement(businessId, input, "STOCK_OUT", -input.quantity, "OUT");
}

export async function markDamaged(businessId: string, input: StockMutationInput) {
  return recordMovement(businessId, input, "DAMAGED", -input.quantity, "OUT");
}

export async function markReturned(businessId: string, input: StockMutationInput) {
  return recordMovement(businessId, input, "RETURNED", input.quantity, "IN");
}

interface TransferInput {
  productId: string;
  variantId?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference?: string;
  reason?: string;
  performedById?: string;
}

export async function transferStock(businessId: string, input: TransferInput) {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw ApiError.badRequest("Source and destination warehouses must differ");
  }
  await assertProductBelongsToBusiness(businessId, input.productId);
  await assertWarehouseBelongsToBusiness(businessId, input.fromWarehouseId);
  await assertWarehouseBelongsToBusiness(businessId, input.toWarehouseId);

  return prisma.$transaction(async (tx) => {
    await applyStockDelta(
      tx,
      { productId: input.productId, variantId: input.variantId, warehouseId: input.fromWarehouseId },
      -input.quantity,
    );
    await applyStockDelta(
      tx,
      { productId: input.productId, variantId: input.variantId, warehouseId: input.toWarehouseId },
      input.quantity,
    );

    return tx.stockMovement.create({
      data: {
        businessId,
        productId: input.productId,
        variantId: input.variantId,
        type: "TRANSFER",
        quantity: input.quantity,
        reference: input.reference,
        reason: input.reason,
        performedById: input.performedById,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
      },
    });
  });
}

interface AdjustmentInput {
  productId: string;
  variantId?: string;
  warehouseId: string;
  batchId?: string;
  newQuantity: number;
  reason: string;
  performedById?: string;
}

export async function adjustStock(businessId: string, input: AdjustmentInput) {
  await assertProductBelongsToBusiness(businessId, input.productId);
  await assertWarehouseBelongsToBusiness(businessId, input.warehouseId);

  return prisma.$transaction(async (tx) => {
    const existing = await findStockRow(tx, {
      productId: input.productId,
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      batchId: input.batchId,
    });
    const currentQty = existing?.quantity ?? 0;
    const delta = input.newQuantity - currentQty;

    if (existing) {
      await tx.stock.update({ where: { id: existing.id }, data: { quantity: input.newQuantity } });
    } else {
      await tx.stock.create({
        data: {
          productId: input.productId,
          variantId: input.variantId ?? null,
          warehouseId: input.warehouseId,
          batchId: input.batchId ?? null,
          quantity: input.newQuantity,
        },
      });
    }

    return tx.stockMovement.create({
      data: {
        businessId,
        productId: input.productId,
        variantId: input.variantId,
        batchId: input.batchId,
        type: "ADJUSTMENT",
        quantity: delta,
        reason: input.reason,
        performedById: input.performedById,
        toWarehouseId: input.warehouseId,
      },
    });
  });
}

export async function listStock(
  businessId: string,
  params: { warehouseId?: string; productId?: string; lowStockOnly?: boolean; page: number; pageSize: number },
) {
  const where: Prisma.StockWhereInput = {
    product: { businessId },
    ...(params.warehouseId && { warehouseId: params.warehouseId }),
    ...(params.productId && { productId: params.productId }),
  };

  const [items, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true, lowStockThreshold: true } }, warehouse: true, variant: true },
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.stock.count({ where }),
  ]);

  const filtered = params.lowStockOnly ? items.filter((s) => s.quantity <= s.product.lowStockThreshold) : items;

  return {
    items: filtered,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function listMovements(
  businessId: string,
  params: { productId?: string; warehouseId?: string; type?: StockMovementType; page: number; pageSize: number },
) {
  const where: Prisma.StockMovementWhereInput = {
    businessId,
    ...(params.productId && { productId: params.productId }),
    ...(params.type && { type: params.type }),
    ...(params.warehouseId && {
      OR: [{ fromWarehouseId: params.warehouseId }, { toWarehouseId: params.warehouseId }],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        performedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}
