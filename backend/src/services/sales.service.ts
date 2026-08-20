import { Prisma, SalesOrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { applyStockDelta } from "./inventory.service";
import { nextSequenceNumber } from "../utils/orderNumber";
import { ensureDefaultAccounts, postAutoJournalEntry, LEDGER_ACCOUNT_CODES } from "./ledger.service";

const DEFAULT_VAT_RATE = 0.13;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

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
  const tax = afterDiscount * (item.taxRate ?? 0);
  return afterDiscount + tax;
}

function computeTotals(items: OrderItemInput[], orderDiscount = 0) {
  const subTotal = roundMoney(items.reduce((sum, i) => sum + i.quantity * i.unitPrice - (i.discount ?? 0), 0) - orderDiscount);
  const taxTotal = roundMoney(subTotal * DEFAULT_VAT_RATE);
  const itemDiscountTotal = items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
  const discountTotal = itemDiscountTotal + orderDiscount;
  const grandTotal = roundMoney(subTotal + taxTotal);
  return { subTotal, vatRate: DEFAULT_VAT_RATE, vatAmount: taxTotal, taxTotal, discountTotal, grandTotal };
}

function withDefaultVat(item: OrderItemInput): OrderItemInput {
  return { ...item, taxRate: DEFAULT_VAT_RATE };
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

  const items = input.items.map(withDefaultVat);
  const totals = computeTotals(items, input.discountTotal ?? 0);

  return prisma.$transaction(async (tx) => {
    const orderNumber = await nextSequenceNumber(tx, "salesOrder", businessId, "SO");

    const order = await tx.salesOrder.create({
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
          create: items.map((i) => ({
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

    await ensureDefaultAccounts(tx, businessId);
    await postAutoJournalEntry(tx, businessId, {
      description: `Sales Order ${order.orderNumber}`,
      reference: order.orderNumber,
      sourceType: "SALES_ORDER",
      sourceId: order.id,
      lines: [
        { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, type: "DEBIT", amount: Number(order.grandTotal) },
        { code: LEDGER_ACCOUNT_CODES.SALES_REVENUE, type: "CREDIT", amount: Number(order.subTotal) },
        { code: LEDGER_ACCOUNT_CODES.VAT_PAYABLE, type: "CREDIT", amount: Number(order.vatAmount) },
      ],
    });
    return order;
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
  requiresVcts?: boolean;
  vehicleNumber?: string;
}

/** Single-transaction POS sale: creates the order, an invoice, deducts stock, records payment(s), and updates the customer ledger for any unpaid balance. */
export async function posCheckout(businessId: string, input: PosCheckoutInput, createdById?: string) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");

  const items = input.items.map(withDefaultVat);
  const totals = computeTotals(items, input.discountTotal ?? 0);
  const amountPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);

  return prisma.$transaction(
    async (tx) => {
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
          create: items.map((i) => ({
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
        requiresVcts: input.requiresVcts ?? false,
        vehicleNumber: input.vehicleNumber,
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
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
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

    // Auto-post to the general ledger: Cash/AR against Revenue+VAT, and COGS against Inventory.
    await ensureDefaultAccounts(tx, businessId);

    const revenueAmount = totals.subTotal;
    await postAutoJournalEntry(tx, businessId, {
      description: `POS Sale ${orderNumber}`,
      reference: invoiceNumber,
      sourceType: "SALES_ORDER",
      sourceId: order.id,
      lines: [
        { code: LEDGER_ACCOUNT_CODES.CASH, type: "DEBIT", amount: amountPaid },
        { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, type: "DEBIT", amount: outstandingAmount },
        { code: LEDGER_ACCOUNT_CODES.SALES_REVENUE, type: "CREDIT", amount: revenueAmount },
        { code: LEDGER_ACCOUNT_CODES.VAT_PAYABLE, type: "CREDIT", amount: totals.taxTotal },
      ],
    });

    const products = await tx.product.findMany({
      where: { id: { in: order.items.map((i) => i.productId) } },
      select: { id: true, purchasePrice: true },
    });
    const costByProduct = new Map(products.map((p) => [p.id, Number(p.purchasePrice)]));
    const cogsAmount = order.items.reduce((sum, i) => sum + i.quantity * (costByProduct.get(i.productId) ?? 0), 0);

    await postAutoJournalEntry(tx, businessId, {
      description: `Cost of goods sold — ${orderNumber}`,
      reference: invoiceNumber,
      sourceType: "SALES_ORDER_COGS",
      sourceId: order.id,
      lines: [
        { code: LEDGER_ACCOUNT_CODES.COGS, type: "DEBIT", amount: cogsAmount },
        { code: LEDGER_ACCOUNT_CODES.INVENTORY, type: "CREDIT", amount: cogsAmount },
      ],
    });

    return { order, invoice };
    },
    { timeout: 15000 },
  );
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
