import { Prisma, SalesOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { applyStockDelta } from "./inventory.service";
import { nextSequenceNumber } from "../utils/orderNumber";

interface OrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

function computeItemTotal(item: OrderItemInput) {
  const gross = item.quantity * item.unitPrice;
  const afterDiscount = gross - (item.discount ?? 0);
  const tax = afterDiscount * ((item.taxRate ?? 0) / 100);
  return afterDiscount + tax;
}

function computeTotals(items: OrderItemInput[], orderDiscount = 0) {
  const subTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxTotal = items.reduce((sum, i) => {
    const afterDiscount = i.quantity * i.unitPrice - (i.discount ?? 0);
    return sum + afterDiscount * ((i.taxRate ?? 0) / 100);
  }, 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
  const discountTotal = itemDiscountTotal + orderDiscount;
  const grandTotal = items.reduce((sum, i) => sum + computeItemTotal(i), 0) - orderDiscount;
  return { subTotal, taxTotal, discountTotal, grandTotal };
}

interface CreateSalesOrderInput {
  customerId?: string;
  branchId?: string;
  warehouseId: string;
  items: OrderItemInput[];
  discountTotal?: number;
  notes?: string;
}

export async function createSalesOrder(businessId: string, input: CreateSalesOrderInput, createdById?: string) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");

  const totals = computeTotals(input.items, input.discountTotal ?? 0);

  return prisma.$transaction(async (tx) => {
    const orderNumber = await nextSequenceNumber(tx, "salesOrder", businessId, "SO");

    return tx.salesOrder.create({
      data: {
        businessId,
        customerId: input.customerId,
        branchId: input.branchId,
        orderNumber,
        status: "CONFIRMED",
        notes: input.notes,
        createdById,
        ...totals,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
            taxRate: i.taxRate ?? 0,
            total: computeItemTotal(i),
          })),
        },
      },
      include: { items: true, customer: true },
    });
  });
}

interface PosPaymentInput {
  method: string;
  amount: number;
  reference?: string;
}

interface PosCheckoutInput {
  customerId?: string;
  warehouseId: string;
  items: OrderItemInput[];
  discountTotal?: number;
  payments: PosPaymentInput[];
}

/** Single-transaction POS sale: creates the order, an invoice, deducts stock, records payment(s), and updates the customer ledger for any unpaid balance. */
export async function posCheckout(businessId: string, input: PosCheckoutInput, createdById?: string) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");

  const totals = computeTotals(input.items, input.discountTotal ?? 0);
  const amountPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);

  return prisma.$transaction(async (tx) => {
    const orderNumber = await nextSequenceNumber(tx, "salesOrder", businessId, "SO");

    const order = await tx.salesOrder.create({
      data: {
        businessId,
        customerId: input.customerId,
        orderNumber,
        status: "FULFILLED",
        isPosSale: true,
        createdById,
        ...totals,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
            taxRate: i.taxRate ?? 0,
            total: computeItemTotal(i),
          })),
        },
      },
      include: { items: true },
    });

    for (const item of order.items) {
      await applyStockDelta(
        tx,
        { productId: item.productId, variantId: item.variantId, warehouseId: input.warehouseId },
        -item.quantity,
      );

      await tx.stockMovement.create({
        data: {
          businessId,
          productId: item.productId,
          variantId: item.variantId,
          type: "SALE",
          quantity: item.quantity,
          reference: orderNumber,
          performedById: createdById,
          fromWarehouseId: input.warehouseId,
        },
      });
    }

    const invoiceNumber = await nextSequenceNumber(tx, "invoice", businessId, "INV");
    const invoice = await tx.invoice.create({
      data: {
        businessId,
        salesOrderId: order.id,
        customerId: input.customerId,
        invoiceNumber,
        status: amountPaid >= totals.grandTotal ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "SENT",
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        grandTotal: totals.grandTotal,
        amountPaid,
        items: {
          create: order.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            taxRate: i.taxRate,
            total: i.total,
          })),
        },
      },
    });

    for (const payment of input.payments) {
      await tx.payment.create({
        data: {
          businessId,
          direction: "INBOUND",
          method: payment.method as never,
          amount: payment.amount,
          reference: payment.reference,
          customerId: input.customerId,
          invoiceId: invoice.id,
        },
      });
    }

    const outstandingAmount = totals.grandTotal - amountPaid;
    if (input.customerId && outstandingAmount > 0) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
      const lastEntry = await tx.customerLedgerEntry.findFirst({
        where: { customerId: input.customerId },
        orderBy: { createdAt: "desc" },
      });
      const previousBalance = lastEntry?.balance ?? customer.openingBalance;
      await tx.customerLedgerEntry.create({
        data: {
          customerId: input.customerId,
          description: `Invoice ${invoiceNumber}`,
          debit: outstandingAmount,
          credit: 0,
          balance: Number(previousBalance) + Number(outstandingAmount),
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
      });
    }

    return { order, invoice };
  });
}

export async function listSalesOrders(
  businessId: string,
  params: { status?: SalesOrderStatus; customerId?: string; page: number; pageSize: number },
) {
  const where: Prisma.SalesOrderWhereInput = {
    businessId,
    ...(params.status && { status: params.status }),
    ...(params.customerId && { customerId: params.customerId }),
  };

  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: { customer: true, items: true, invoice: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getSalesOrderById(businessId: string, id: string) {
  const order = await prisma.salesOrder.findFirst({
    where: { id, businessId },
    include: { customer: true, items: { include: { product: true, variant: true } }, invoice: true },
  });
  if (!order) throw ApiError.notFound("Sales order not found");
  return order;
}
