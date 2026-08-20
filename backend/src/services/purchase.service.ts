import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { applyStockDelta } from "./inventory.service";
import { nextSequenceNumber } from "../utils/orderNumber";
import { ensureDefaultAccounts, postAutoJournalEntry, LEDGER_ACCOUNT_CODES } from "./ledger.service";

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
}

const DEFAULT_VAT_RATE = 13;

function withDefaultVat(item: PurchaseItemInput): PurchaseItemInput {
  return { ...item, taxRate: item.taxRate ?? DEFAULT_VAT_RATE };
}

function computeItemTotal(item: PurchaseItemInput) {
  const gross = item.quantityOrdered * item.unitCost;
  const afterDiscount = gross - (item.discount ?? 0);
  const tax = afterDiscount * ((item.taxRate ?? 0) / 100);
  return afterDiscount + tax;
}

export async function createPurchaseOrder(businessId: string, input: CreatePurchaseOrderInput) {
  const supplier = await prisma.supplier.findFirst({ where: { id: input.supplierId, businessId } });
  if (!supplier) throw ApiError.notFound("Supplier not found");

  const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");

  const items = input.items.map(withDefaultVat);
  const subTotal = items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost, 0);
  const taxTotal = items.reduce((sum, i) => {
    const afterDiscount = i.quantityOrdered * i.unitCost - (i.discount ?? 0);
    return sum + afterDiscount * ((i.taxRate ?? 0) / 100);
  }, 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
  const discountTotal = itemDiscountTotal + (input.discountTotal ?? 0);
  const grandTotal = items.reduce((sum, i) => sum + computeItemTotal(i), 0) - (input.discountTotal ?? 0);

  return prisma.$transaction(async (tx) => {
    const poNumber = await nextSequenceNumber(tx, "purchaseOrder", businessId, "PO");

    return tx.purchaseOrder.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        poNumber,
        status: "ORDERED",
        expectedDate: input.expectedDate,
        notes: input.notes,
        subTotal,
        taxTotal,
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

    // Auto-post to the general ledger: receiving goods increases Inventory and the
    // amount owed to the supplier (Accounts Payable).
    if (receivedCost > 0) {
      await ensureDefaultAccounts(tx, businessId);
      await postAutoJournalEntry(tx, businessId, {
        description: `Goods received — ${po.poNumber}`,
        reference: po.poNumber,
        lines: [
          { code: LEDGER_ACCOUNT_CODES.INVENTORY, type: "DEBIT", amount: receivedCost },
          { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_PAYABLE, type: "CREDIT", amount: receivedCost },
        ],
      });
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
