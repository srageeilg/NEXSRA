import dayjs from "dayjs";
import { prisma } from "../config/prisma";

const ACTIVE_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

function resolveRange(from?: Date, to?: Date) {
  return {
    start: from ?? dayjs().subtract(30, "day").startOf("day").toDate(),
    end: to ?? dayjs().endOf("day").toDate(),
  };
}

export async function getSalesReport(businessId: string, from?: Date, to?: Date) {
  const { start, end } = resolveRange(from, to);

  const invoices = await prisma.invoice.findMany({
    where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: start, lte: end } },
    select: { invoiceNumber: true, issueDate: true, grandTotal: true, customer: { select: { name: true } } },
    orderBy: { issueDate: "asc" },
  });

  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0);

  return {
    range: { start, end },
    totalRevenue,
    invoiceCount: invoices.length,
    rows: invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      date: i.issueDate.toISOString().slice(0, 10),
      customer: i.customer?.name ?? "Walk-in",
      total: Number(i.grandTotal),
    })),
  };
}

export async function getPurchaseReport(businessId: string, from?: Date, to?: Date) {
  const { start, end } = resolveRange(from, to);

  const orders = await prisma.purchaseOrder.findMany({
    where: { businessId, createdAt: { gte: start, lte: end } },
    select: { poNumber: true, createdAt: true, grandTotal: true, status: true, supplier: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalSpend = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);

  return {
    range: { start, end },
    totalSpend,
    orderCount: orders.length,
    rows: orders.map((o) => ({
      poNumber: o.poNumber,
      date: o.createdAt.toISOString().slice(0, 10),
      supplier: o.supplier.name,
      status: o.status,
      total: Number(o.grandTotal),
    })),
  };
}

export async function getInventoryReport(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      purchasePrice: true,
      sellingPrice: true,
      lowStockThreshold: true,
      stocks: { select: { quantity: true } },
    },
  });

  const rows = products.map((p) => {
    const totalQty = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      sku: p.sku,
      name: p.name,
      quantity: totalQty,
      lowStockThreshold: p.lowStockThreshold,
      valuation: totalQty * Number(p.purchasePrice),
      status: totalQty === 0 ? "OUT_OF_STOCK" : totalQty <= p.lowStockThreshold ? "LOW_STOCK" : "OK",
    };
  });

  return {
    totalValuation: rows.reduce((sum, r) => sum + r.valuation, 0),
    lowStockCount: rows.filter((r) => r.status === "LOW_STOCK").length,
    outOfStockCount: rows.filter((r) => r.status === "OUT_OF_STOCK").length,
    rows,
  };
}

export async function getCustomerReport(businessId: string) {
  const customers = await prisma.customer.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      openingBalance: true,
      invoices: { select: { grandTotal: true, status: true } },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const rows = customers.map((c) => ({
    name: c.name,
    invoiceCount: c.invoices.length,
    totalRevenue: c.invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0),
    outstandingBalance: Number(c.ledgerEntries[0]?.balance ?? c.openingBalance),
  }));

  return { rows: rows.sort((a, b) => b.totalRevenue - a.totalRevenue) };
}

export async function getSupplierReport(businessId: string) {
  const suppliers = await prisma.supplier.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      openingBalance: true,
      purchaseOrders: { select: { grandTotal: true } },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const rows = suppliers.map((s) => ({
    name: s.name,
    orderCount: s.purchaseOrders.length,
    totalSpend: s.purchaseOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0),
    outstandingBalance: Number(s.ledgerEntries[0]?.balance ?? s.openingBalance),
  }));

  return { rows: rows.sort((a, b) => b.totalSpend - a.totalSpend) };
}

export async function getExpenseReport(businessId: string, from?: Date, to?: Date) {
  const { start, end } = resolveRange(from, to);

  const expenses = await prisma.expense.findMany({
    where: { businessId, expenseDate: { gte: start, lte: end } },
    select: { amount: true, category: { select: { name: true } } },
  });

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category.name;
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount));
  }

  return {
    range: { start, end },
    totalExpenses: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    rows: Array.from(byCategory.entries()).map(([category, total]) => ({ category, total })),
  };
}

export async function getEmployeeReport(businessId: string) {
  const employees = await prisma.employee.findMany({
    where: { businessId },
    select: {
      firstName: true,
      lastName: true,
      employeeCode: true,
      department: { select: { name: true } },
      isActive: true,
      _count: { select: { attendances: true, leaveRequests: true } },
    },
  });

  return {
    rows: employees.map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      employeeCode: e.employeeCode,
      department: e.department?.name ?? "—",
      isActive: e.isActive,
      attendanceRecords: e._count.attendances,
      leaveRequests: e._count.leaveRequests,
    })),
  };
}
