import dayjs from "dayjs";
import { prisma } from "../config/prisma";

const ACTIVE_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

export async function getDashboardSummary(businessId: string) {
  const startOfToday = dayjs().startOf("day").toDate();
  const startOfMonth = dayjs().startOf("month").toDate();
  const fourteenDaysAgo = dayjs().subtract(13, "day").startOf("day").toDate();
  const sixMonthsAgo = dayjs().subtract(5, "month").startOf("month").toDate();

  const [
    todaySalesAgg,
    monthRevenueAgg,
    lowStockProducts,
    pendingOrders,
    purchaseOrdersOpen,
    recentInvoices,
    recentPayments,
    salesLast14Days,
    invoiceItemsForCost,
    stocks,
    topSellingRaw,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: startOfToday } },
      _sum: { grandTotal: true },
    }),
    prisma.invoice.aggregate({
      where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: startOfMonth } },
      _sum: { grandTotal: true },
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, sku: true, lowStockThreshold: true, stocks: { select: { quantity: true } } },
    }),
    prisma.salesOrder.count({ where: { businessId, status: { in: ["DRAFT", "CONFIRMED", "PARTIALLY_FULFILLED"] } } }),
    prisma.purchaseOrder.count({ where: { businessId, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } } }),
    prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, amount: true, method: true, direction: true, createdAt: true, reference: true },
    }),
    prisma.invoice.findMany({
      where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: fourteenDaysAgo } },
      select: { issueDate: true, grandTotal: true },
    }),
    prisma.invoiceItem.findMany({
      where: { invoice: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: startOfMonth } } },
      select: { quantity: true, product: { select: { purchasePrice: true } } },
    }),
    prisma.stock.findMany({
      where: { product: { businessId } },
      select: { quantity: true, product: { select: { purchasePrice: true } } },
    }),
    prisma.invoiceItem.groupBy({
      by: ["productId"],
      where: { invoice: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const outOfStockCount = lowStockProducts.filter((p) => totalQty(p.stocks) === 0).length;
  const lowStockCount = lowStockProducts.filter((p) => {
    const qty = totalQty(p.stocks);
    return qty > 0 && qty <= p.lowStockThreshold;
  }).length;

  const monthRevenue = Number(monthRevenueAgg._sum.grandTotal ?? 0);
  const monthCost = invoiceItemsForCost.reduce((sum, i) => sum + i.quantity * Number(i.product.purchasePrice), 0);
  const monthProfit = monthRevenue - monthCost;

  const inventoryValue = stocks.reduce((sum, s) => sum + s.quantity * Number(s.product.purchasePrice), 0);

  const salesGraph = buildDailySeries(fourteenDaysAgo, salesLast14Days.map((i) => ({ date: i.issueDate, value: Number(i.grandTotal) })));

  const monthlyProfit = await buildMonthlyProfitSeries(businessId, sixMonthsAgo);

  const topProductIds = topSellingRaw.map((t) => t.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, sku: true },
  });
  const topSellingProducts = topSellingRaw.map((t) => ({
    product: topProducts.find((p) => p.id === t.productId),
    quantitySold: t._sum.quantity ?? 0,
    revenue: Number(t._sum.total ?? 0),
  }));

  // Includes out-of-stock (qty === 0) products too — the dashboard's stock alert list
  // should name every alerted product, not just the low-but-nonzero ones, so the alert
  // count and the visible list always match.
  const lowStockItems = lowStockProducts
    .filter((p) => totalQty(p.stocks) <= p.lowStockThreshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      currentQty: totalQty(p.stocks),
      threshold: p.lowStockThreshold,
    }));

  return {
    todaySales: Number(todaySalesAgg._sum.grandTotal ?? 0),
    monthRevenue,
    monthProfit,
    lowStockCount,
    outOfStockCount,
    pendingOrders,
    purchaseOrdersOpen,
    inventoryValue,
    salesGraph,
    monthlyProfit,
    topSellingProducts,
    lowStockItems,
    recentTransactions: buildRecentTransactions(recentInvoices, recentPayments),
  };
}

function totalQty(stocks: { quantity: number }[]) {
  return stocks.reduce((sum, s) => sum + s.quantity, 0);
}

function buildDailySeries(from: Date, points: { date: Date; value: number }[]) {
  const days: { date: string; value: number }[] = [];
  let cursor = dayjs(from);
  const today = dayjs();
  while (cursor.isBefore(today) || cursor.isSame(today, "day")) {
    const dateKey = cursor.format("YYYY-MM-DD");
    const value = points
      .filter((p) => dayjs(p.date).format("YYYY-MM-DD") === dateKey)
      .reduce((sum, p) => sum + p.value, 0);
    days.push({ date: cursor.format("MMM D"), value });
    cursor = cursor.add(1, "day");
  }
  return days;
}

async function buildMonthlyProfitSeries(businessId: string, from: Date) {
  // Build all month ranges first, then fire all DB queries in parallel
  const ranges: { start: Date; end: Date; label: string }[] = [];
  let cursor = dayjs(from).startOf("month");
  const now = dayjs().startOf("month");

  while (cursor.isBefore(now) || cursor.isSame(now, "month")) {
    ranges.push({ start: cursor.toDate(), end: cursor.add(1, "month").toDate(), label: cursor.format("MMM") });
    cursor = cursor.add(1, "month");
  }

  const results = await Promise.all(
    ranges.map(async ({ start, end, label }) => {
      const [revenueAgg, items] = await Promise.all([
        prisma.invoice.aggregate({
          where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: start, lt: end } },
          _sum: { grandTotal: true },
        }),
        prisma.invoiceItem.findMany({
          where: { invoice: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: start, lt: end } } },
          select: { quantity: true, product: { select: { purchasePrice: true } } },
        }),
      ]);
      const revenue = Number(revenueAgg._sum.grandTotal ?? 0);
      const cost = items.reduce((sum, i) => sum + i.quantity * Number(i.product.purchasePrice), 0);
      return { month: label, revenue, profit: revenue - cost };
    }),
  );

  return results;
}

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  grandTotal: string | number | { toNumber: () => number };
  status: string;
  createdAt: Date;
  customer: { name: string } | null;
};

type PaymentRow = {
  id: string;
  amount: string | number | { toNumber: () => number };
  method: string;
  direction: string;
  createdAt: Date;
  reference: string | null;
};

function buildRecentTransactions(invoices: InvoiceRow[], payments: PaymentRow[]) {
  const invoiceTx = invoices.map((inv) => ({
    id: inv.id,
    type: "INVOICE" as const,
    label: `Invoice ${inv.invoiceNumber}${inv.customer ? ` — ${inv.customer.name}` : ""}`,
    amount: Number(inv.grandTotal),
    status: inv.status,
    date: inv.createdAt,
  }));
  const paymentTx = payments.map((p) => ({
    id: p.id,
    type: "PAYMENT" as const,
    label: `${p.direction === "INBOUND" ? "Payment received" : "Payment made"} (${p.method})`,
    amount: Number(p.amount),
    status: p.direction,
    date: p.createdAt,
  }));

  return [...invoiceTx, ...paymentTx].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 10);
}
