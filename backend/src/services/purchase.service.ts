import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { applyStockDelta } from "./inventory.service";
import { nextSequenceNumber } from "../utils/orderNumber";
import { ensureDefaultAccounts, postAutoJournalEntry, LEDGER_ACCOUNT_CODES } from "./ledger.service";
import { logger } from "../config/logger";

interface PurchaseItemInput {
  productId: string;
  variantId?: string;
  quantityOrdered: number;
  unitCost: number;
  discount?: number;
  taxRate?: number;
}

interface CreatePurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  items: PurchaseItemInput[];
  discountTotal?: number;
  expectedDate?: Date;
  notes?: string;
  applyVat?: boolean;
}

const DEFAULT_VAT_RATE = 0.13;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function withDefaultVat(item: PurchaseItemInput, applyVat: boolean): PurchaseItemInput {
  return { ...item, taxRate: applyVat ? DEFAULT_VAT_RATE : 0 };
}

function computeItemTotal(item: PurchaseItemInput) {
  const gross = item.quantityOrdered * item.unitCost;
  const afterDiscount = gross - (item.discount ?? 0);
  const tax = afterDiscount * (item.taxRate ?? 0);
  return afterDiscount + tax;
}

export async function createPurchaseOrder(businessId: string, input: CreatePurchaseOrderInput) {
  const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, businessId } });
  if (!supplier) throw ApiError.notFound("Supplier not found");

  const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");

  const applyVat = input.applyVat ?? true;
  const items = input.items.map((item) => withDefaultVat(item, applyVat));
  const subTotal = roundMoney(items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost - (i.discount ?? 0), 0) - (input.discountTotal ?? 0));
  const vatAmount = applyVat ? roundMoney(subTotal * DEFAULT_VAT_RATE) : 0;
  const itemDiscountTotal = items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
  const discountTotal = itemDiscountTotal + (input.discountTotal ?? 0);
  const grandTotal = roundMoney(subTotal + vatAmount);

  return prisma.$transaction(async (tx) => {
    const poNumber = await nextSequenceNumber(tx, "purchaseOrder", businessId, "PO");

    const po = await tx.purchaseOrder.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        poNumber,
        status: "ORDERED",
        expectedDate: input.expectedDate,
        notes: input.notes,
        subTotal,
        applyVat,
        vatRate: applyVat ? DEFAULT_VAT_RATE : 0,
        vatAmount,
        taxTotal: vatAmount,
        discountTotal,
        grandTotal,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantityOrdered: i.quantityOrdered,
            unitCost: i.unitCost,
            discount: i.discount ?? 0,
            taxRate: i.taxRate ?? 0,
            total: computeItemTotal(i),
          })),
        },
      },
      include: { items: true, supplier: true, warehouse: true },
    });

    try {
      await ensureDefaultAccounts(tx, businessId);
      await postAutoJournalEntry(tx, businessId, {
        description: `Purchase Order ${po.poNumber}`,
        reference: po.poNumber,
        sourceType: "PURCHASE_ORDER",
        sourceId: po.id,
        lines: [
          { code: LEDGER_ACCOUNT_CODES.PURCHASES_INVENTORY, type: "DEBIT", amount: Number(po.subTotal) },
          ...(Number(po.vatAmount) > 0 ? [{ code: LEDGER_ACCOUNT_CODES.VAT_RECEIVABLE, type: "DEBIT" as const, amount: Number(po.vatAmount) }] : []),
          { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_PAYABLE, type: "CREDIT", amount: Number(po.grandTotal) },
        ],
      });
    } catch (error) {
      logger.error({ err: error, businessId, purchaseOrderId: po.id, poNumber: po.poNumber }, "Purchase order ledger posting failed");
      throw error;
    }
    return po;
  });
}

export async function listPurchaseOrders(
  businessId: string,
  params: { status?: PurchaseOrderStatus; supplierId?: string; page: number; pageSize: number },
) {
  const where: Prisma.PurchaseOrderWhereInput = {
    businessId,
    ...(params.status && { status: params.status }),
    ...(params.supplierId && { supplierId: params.supplierId }),
  };

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, warehouse: true, items: { include: { product: { select: { id: true, name: true, sku: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getPurchaseOrderById(businessId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, businessId },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { product: true, variant: true } },
      payments: true,
    },
  });
  if (!po) throw ApiError.notFound("Purchase order not found");
  return po;
}

interface ReceiveGoodsInput {
  items: { itemId: string; quantityReceived: number }[];
}

export async function receiveGoods(businessId: string, poId: string, input: ReceiveGoodsInput, performedById?: string) {
  return prisma.$transaction(
    async (tx) => {
    const po = await tx.purchaseOrder.findFirst({ where: { id: poId, businessId }, include: { items: true } });
    if (!po) throw ApiError.notFound("Purchase order not found");
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      throw ApiError.badRequest(`Cannot receive goods for a purchase order with status ${po.status}`);
    }

    let receivedCost = 0;

    for (const receipt of input.items) {
      const item = po.items.find((i) => i.id === receipt.itemId);
      if (!item) throw ApiError.badRequest(`Item ${receipt.itemId} does not belong to this purchase order`);

      const remaining = item.quantityOrdered - item.quantityReceived;
      if (receipt.quantityReceived > remaining) {
        throw ApiError.badRequest(`Cannot receive more than the remaining ${remaining} unit(s) for this item`);
      }

      await applyStockDelta(
        tx,
        { productId: item.productId, variantId: item.variantId, warehouseId: po.warehouseId },
        receipt.quantityReceived,
      );

      await tx.stockMovement.create({
        data: {
          businessId,
          productId: item.productId,
          variantId: item.variantId,
          type: "PURCHASE",
          quantity: receipt.quantityReceived,
          unitCost: item.unitCost,
          reference: po.poNumber,
          performedById,
          toWarehouseId: po.warehouseId,
        },
      });

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: item.quantityReceived + receipt.quantityReceived },
      });

      receivedCost += receipt.quantityReceived * Number(item.unitCost);
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
    const allReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const someReceived = refreshedItems.some((i) => i.quantityReceived > 0);

    return tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : po.status },
      include: { items: true },
    });
    },
    { timeout: 15000 },
  );
}
