import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import { AccountType, JournalEntryType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { formatCurrency } from "../utils/format";

export async function listAccounts(businessId: string) {
  return prisma.account.findMany({ where: { businessId }, orderBy: { code: "asc" } });
}

export async function createAccount(businessId: string, data: { name: string; code: string; type: AccountType }) {
  const existing = await prisma.account.findFirst({ where: { businessId, code: data.code } });
  if (existing) throw ApiError.conflict("An account with this code already exists");
  return prisma.account.create({ data: { ...data, businessId } });
}

interface JournalLineInput {
  accountId: string;
  type: JournalEntryType;
  amount: number;
}

export async function createJournalEntry(
  businessId: string,
  data: { description: string; reference?: string; entryDate?: Date; lines: JournalLineInput[] },
) {
  const totalDebits = data.lines.filter((l) => l.type === "DEBIT").reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = data.lines.filter((l) => l.type === "CREDIT").reduce((sum, l) => sum + l.amount, 0);
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw ApiError.badRequest(`Journal entry is unbalanced: debits ${totalDebits.toFixed(2)} ≠ credits ${totalCredits.toFixed(2)}`);
  }
  if (data.lines.length < 2) {
    throw ApiError.badRequest("A journal entry requires at least two lines");
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        businessId,
        description: data.description,
        reference: data.reference,
        entryDate: data.entryDate ?? new Date(),
        lines: { create: data.lines },
      },
      include: { lines: { include: { account: true } } },
    });

    for (const line of data.lines) {
      const account = await tx.account.findFirst({ where: { id: line.accountId, businessId } });
      if (!account) throw ApiError.notFound(`Account ${line.accountId} not found`);

      const delta = line.type === "DEBIT" ? line.amount : -line.amount;
      const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
      const signedDelta = isDebitNormal ? delta : -delta;

      await tx.account.update({ where: { id: account.id }, data: { balance: Number(account.balance) + signedDelta } });
    }

    return entry;
  });
}

type Align = "left" | "right";
interface ReportColumn {
  label: string;
  width: number;
  align?: Align;
}
interface ReportRow {
  cells: string[];
  bold?: boolean;
}

/** Shared renderer for the simple grouped-table reports (Trial Balance, Balance Sheet,
 * Income Statement) — a title block followed by one or more titled tables. */
function renderTabularReportPdf(
  businessName: string,
  reportTitle: string,
  sections: { heading: string; columns: ReportColumn[]; rows: ReportRow[] }[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.font("Helvetica-Bold").fontSize(18).text(businessName, left, doc.y, { width: pageWidth, align: "center" });
    doc.font("Helvetica-Bold").fontSize(13).text(reportTitle, { width: pageWidth, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666")
      .text(`As of ${new Date().toISOString().slice(0, 10)}`, { width: pageWidth, align: "center" });
    doc.fillColor("#000");
    doc.moveDown(1.2);

    for (const section of sections) {
      if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();

      doc.font("Helvetica-Bold").fontSize(12).text(section.heading, left, doc.y, { width: pageWidth });
      doc.moveDown(0.3);

      const rowHeight = 18;
      let x = left;
      const headerY = doc.y;
      doc.font("Helvetica-Bold").fontSize(9.5);
      for (const col of section.columns) {
        doc.text(col.label, x + 2, headerY, { width: col.width - 4, align: col.align ?? "left" });
        x += col.width;
      }
      doc.y = headerY + 14;
      doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);

      for (const row of section.rows) {
        if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
        doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
        x = left;
        const y = doc.y;
        for (let i = 0; i < section.columns.length; i++) {
          const col = section.columns[i];
          doc.text(row.cells[i] ?? "", x + 2, y, { width: col.width - 4, align: col.align ?? "left" });
          x += col.width;
        }
        doc.y = y + rowHeight;
        if (row.bold) {
          doc.moveTo(left, doc.y - 3).lineTo(left + pageWidth, doc.y - 3).stroke();
        }
      }

      doc.moveDown(1);
    }

    doc.end();
  });
}

export async function generateTrialBalancePdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const accounts = await prisma.account.findMany({ where: { businessId }, orderBy: { code: "asc" } });
  const currency = business.currency;

  const columns: ReportColumn[] = [
    { label: "Code", width: 50 },
    { label: "Account", width: 240 },
    { label: "Debit", width: 90, align: "right" },
    { label: "Credit", width: 90, align: "right" },
  ];

  let totalDebit = 0;
  let totalCredit = 0;
  const rows: ReportRow[] = accounts.map((a) => {
    const balance = Number(a.balance);
    const isDebitNormal = a.type === "ASSET" || a.type === "EXPENSE";
    const debit = isDebitNormal ? Math.max(balance, 0) : Math.max(-balance, 0);
    const credit = isDebitNormal ? Math.max(-balance, 0) : Math.max(balance, 0);
    totalDebit += debit;
    totalCredit += credit;
    return {
      cells: [
        a.code,
        a.name,
        debit > 0 ? formatCurrency(debit, currency) : "",
        credit > 0 ? formatCurrency(credit, currency) : "",
      ],
    };
  });
  rows.push({
    cells: ["", "Total", formatCurrency(totalDebit, currency), formatCurrency(totalCredit, currency)],
    bold: true,
  });

  return renderTabularReportPdf(business.name, "Trial Balance", [{ heading: "All Accounts", columns, rows }]);
}

export async function generateBalanceSheetPdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const accounts = await prisma.account.findMany({ where: { businessId }, orderBy: { code: "asc" } });
  const currency = business.currency;

  const columns: ReportColumn[] = [
    { label: "Code", width: 50 },
    { label: "Account", width: 300 },
    { label: "Amount", width: 110, align: "right" },
  ];

  const byType = (type: AccountType) => accounts.filter((a) => a.type === type);
  const sumOf = (type: AccountType) => byType(type).reduce((s, a) => s + Number(a.balance), 0);
  const toRows = (type: AccountType) =>
    byType(type).map((a) => ({ cells: [a.code, a.name, formatCurrency(Number(a.balance), currency)] }));

  const totalAssets = sumOf("ASSET");
  const totalLiabilities = sumOf("LIABILITY");
  const explicitEquity = sumOf("EQUITY");
  // Undistributed profit/loss to date — closes Income and Expense into Equity so the
  // sheet balances without requiring a formal period-end closing entry.
  const retainedEarnings = sumOf("INCOME") - sumOf("EXPENSE");
  const totalEquity = explicitEquity + retainedEarnings;

  const equityRows = toRows("EQUITY");
  equityRows.push({ cells: ["", "Retained Earnings (net income to date)", formatCurrency(retainedEarnings, currency)] });

  return renderTabularReportPdf(business.name, "Balance Sheet", [
    {
      heading: "Assets",
      columns,
      rows: [...toRows("ASSET"), { cells: ["", "Total Assets", formatCurrency(totalAssets, currency)], bold: true }],
    },
    {
      heading: "Liabilities",
      columns,
      rows: [
        ...toRows("LIABILITY"),
        { cells: ["", "Total Liabilities", formatCurrency(totalLiabilities, currency)], bold: true },
      ],
    },
    {
      heading: "Equity",
      columns,
      rows: [...equityRows, { cells: ["", "Total Equity", formatCurrency(totalEquity, currency)], bold: true }],
    },
    {
      heading: "Check",
      columns,
      rows: [
        {
          cells: ["", "Total Liabilities + Equity", formatCurrency(totalLiabilities + totalEquity, currency)],
          bold: true,
        },
      ],
    },
  ]);
}

export async function generateIncomeStatementPdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const accounts = await prisma.account.findMany({ where: { businessId }, orderBy: { code: "asc" } });
  const currency = business.currency;

  const columns: ReportColumn[] = [
    { label: "Code", width: 50 },
    { label: "Account", width: 300 },
    { label: "Amount", width: 110, align: "right" },
  ];

  const byType = (type: AccountType) => accounts.filter((a) => a.type === type);
  const sumOf = (type: AccountType) => byType(type).reduce((s, a) => s + Number(a.balance), 0);
  const toRows = (type: AccountType) =>
    byType(type).map((a) => ({ cells: [a.code, a.name, formatCurrency(Number(a.balance), currency)] }));

  const totalRevenue = sumOf("INCOME");
  const totalExpenses = sumOf("EXPENSE");
  const netIncome = totalRevenue - totalExpenses;

  return renderTabularReportPdf(business.name, "Income Statement", [
    {
      heading: "Revenue",
      columns,
      rows: [...toRows("INCOME"), { cells: ["", "Total Revenue", formatCurrency(totalRevenue, currency)], bold: true }],
    },
    {
      heading: "Expenses",
      columns,
      rows: [
        ...toRows("EXPENSE"),
        { cells: ["", "Total Expenses", formatCurrency(totalExpenses, currency)], bold: true },
      ],
    },
    {
      heading: "Result",
      columns,
      rows: [{ cells: ["", netIncome >= 0 ? "Net Profit" : "Net Loss", formatCurrency(netIncome, currency)], bold: true }],
    },
  ]);
}

const ACTIVE_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;
const OUTSTANDING_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;
const OUTSTANDING_PO_STATUSES = ["ORDERED", "PARTIALLY_RECEIVED"] as const;

/** Standard monthly VAT return: Output VAT from sales vs Input VAT from purchases,
 * net payable (or refundable/carried forward) — the numbers a VAT-registered
 * Nepali business reports to IRD each month. */
export async function generateVatReturnPdf(businessId: string, from?: Date, to?: Date): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const currency = business.currency;
  const start = from ?? dayjs().startOf("month").toDate();
  const end = to ?? dayjs().endOf("month").toDate();

  const [invoices, purchases] = await Promise.all([
    prisma.invoice.findMany({
      where: { businessId, status: { in: [...ACTIVE_INVOICE_STATUSES] }, issueDate: { gte: start, lte: end } },
      select: { subTotal: true, discountTotal: true, taxTotal: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { businessId, orderDate: { gte: start, lte: end } },
      select: { subTotal: true, discountTotal: true, taxTotal: true },
    }),
  ]);

  const taxableSales = invoices.reduce((s, i) => s + Number(i.subTotal) - Number(i.discountTotal), 0);
  const outputVat = invoices.reduce((s, i) => s + Number(i.taxTotal), 0);
  const taxablePurchases = purchases.reduce((s, p) => s + Number(p.subTotal) - Number(p.discountTotal), 0);
  const inputVat = purchases.reduce((s, p) => s + Number(p.taxTotal), 0);
  const netVat = outputVat - inputVat;

  const columns: ReportColumn[] = [
    { label: "Particulars", width: 320 },
    { label: "Amount", width: 140, align: "right" },
  ];

  return renderTabularReportPdf(business.name, "VAT Return", [
    {
      heading: `Period: ${dayjs(start).format("MMM D, YYYY")} – ${dayjs(end).format("MMM D, YYYY")}`,
      columns,
      rows: [
        { cells: ["Taxable Sales (net of discount)", formatCurrency(taxableSales, currency)] },
        { cells: ["Output VAT (VAT collected on sales)", formatCurrency(outputVat, currency)], bold: true },
        { cells: ["Taxable Purchases (net of discount)", formatCurrency(taxablePurchases, currency)] },
        { cells: ["Input VAT (VAT paid on purchases)", formatCurrency(inputVat, currency)], bold: true },
        {
          cells: [
            netVat >= 0 ? "Net VAT Payable" : "Net VAT Refundable / Carried Forward",
            formatCurrency(Math.abs(netVat), currency),
          ],
          bold: true,
        },
      ],
    },
  ]);
}

function agingBucket(days: number): string {
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
}

const AGING_BUCKETS = ["0-30 days", "31-60 days", "61-90 days", "90+ days"] as const;

/** Accounts Receivable aging — every unpaid/partially-paid invoice, bucketed by how
 * long it's been outstanding, so you know who to chase for collections. */
export async function generateArAgingPdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const currency = business.currency;

  const invoices = await prisma.invoice.findMany({
    where: { businessId, status: { in: [...OUTSTANDING_INVOICE_STATUSES] } },
    select: { invoiceNumber: true, issueDate: true, grandTotal: true, amountPaid: true, customer: { select: { name: true } } },
    orderBy: { issueDate: "asc" },
  });

  const now = dayjs();
  const rows = invoices
    .map((inv) => {
      const outstanding = Number(inv.grandTotal) - Number(inv.amountPaid);
      const days = now.diff(dayjs(inv.issueDate), "day");
      return {
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer?.name ?? "Walk-in",
        days,
        outstanding,
        bucket: agingBucket(days),
      };
    })
    .filter((r) => r.outstanding > 0.01);

  const totals: Record<string, number> = { "0-30 days": 0, "31-60 days": 0, "61-90 days": 0, "90+ days": 0 };
  rows.forEach((r) => {
    totals[r.bucket] += r.outstanding;
  });
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  const summaryColumns: ReportColumn[] = [
    { label: "Age", width: 300 },
    { label: "Outstanding", width: 160, align: "right" },
  ];
  const detailColumns: ReportColumn[] = [
    { label: "Invoice", width: 70 },
    { label: "Customer", width: 150 },
    { label: "Days", width: 45, align: "right" },
    { label: "Age", width: 90 },
    { label: "Outstanding", width: 105, align: "right" },
  ];

  return renderTabularReportPdf(business.name, "Accounts Receivable Aging", [
    {
      heading: "Summary",
      columns: summaryColumns,
      rows: [
        ...AGING_BUCKETS.map((b) => ({ cells: [b, formatCurrency(totals[b], currency)] })),
        { cells: ["Total Outstanding", formatCurrency(grandTotal, currency)], bold: true },
      ],
    },
    {
      heading: "Outstanding Invoices",
      columns: detailColumns,
      rows:
        rows.length > 0
          ? rows.map((r) => ({
              cells: [r.invoiceNumber, r.customer, String(r.days), r.bucket, formatCurrency(r.outstanding, currency)],
            }))
          : [{ cells: ["—", "No outstanding invoices", "", "", ""] }],
    },
  ]);
}

/** Accounts Payable aging — every unpaid/partially-paid purchase order, bucketed by
 * how long it's been outstanding, so you know what's coming due to suppliers. */
export async function generateApAgingPdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const currency = business.currency;

  const orders = await prisma.purchaseOrder.findMany({
    where: { businessId, status: { in: [...OUTSTANDING_PO_STATUSES] } },
    select: { poNumber: true, orderDate: true, grandTotal: true, amountPaid: true, supplier: { select: { name: true } } },
    orderBy: { orderDate: "asc" },
  });

  const now = dayjs();
  const rows = orders
    .map((po) => {
      const outstanding = Number(po.grandTotal) - Number(po.amountPaid);
      const days = now.diff(dayjs(po.orderDate), "day");
      return {
        poNumber: po.poNumber,
        supplier: po.supplier.name,
        days,
        outstanding,
        bucket: agingBucket(days),
      };
    })
    .filter((r) => r.outstanding > 0.01);

  const totals: Record<string, number> = { "0-30 days": 0, "31-60 days": 0, "61-90 days": 0, "90+ days": 0 };
  rows.forEach((r) => {
    totals[r.bucket] += r.outstanding;
  });
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  const summaryColumns: ReportColumn[] = [
    { label: "Age", width: 300 },
    { label: "Outstanding", width: 160, align: "right" },
  ];
  const detailColumns: ReportColumn[] = [
    { label: "PO #", width: 70 },
    { label: "Supplier", width: 150 },
    { label: "Days", width: 45, align: "right" },
    { label: "Age", width: 90 },
    { label: "Outstanding", width: 105, align: "right" },
  ];

  return renderTabularReportPdf(business.name, "Accounts Payable Aging", [
    {
      heading: "Summary",
      columns: summaryColumns,
      rows: [
        ...AGING_BUCKETS.map((b) => ({ cells: [b, formatCurrency(totals[b], currency)] })),
        { cells: ["Total Outstanding", formatCurrency(grandTotal, currency)], bold: true },
      ],
    },
    {
      heading: "Outstanding Purchase Orders",
      columns: detailColumns,
      rows:
        rows.length > 0
          ? rows.map((r) => ({
              cells: [r.poNumber, r.supplier, String(r.days), r.bucket, formatCurrency(r.outstanding, currency)],
            }))
          : [{ cells: ["—", "No outstanding purchase orders", "", "", ""] }],
    },
  ]);
}

export async function generateGeneralLedgerPdf(businessId: string): Promise<Buffer> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const currency = business.currency;

  const accounts = await prisma.account.findMany({
    where: { businessId },
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        include: { journalEntry: true },
        orderBy: [{ journalEntry: { entryDate: "asc" } }, { id: "asc" }],
      },
    },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.font("Helvetica-Bold").fontSize(18).text(business.name, left, doc.y, { width: pageWidth, align: "center" });
    doc.font("Helvetica-Bold").fontSize(13).text("General Ledger", { width: pageWidth, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated ${new Date().toISOString().slice(0, 10)}`, { width: pageWidth, align: "center" });
    doc.fillColor("#000");
    doc.moveDown(1);

    const colWidths = { date: 70, desc: pageWidth - 70 - 80 - 80 - 90, debit: 80, credit: 80, balance: 90 };
    const rowHeight = 18;

    function drawHeaderRow(y: number) {
      doc.font("Helvetica-Bold").fontSize(9);
      let x = left;
      const cols: [string, number, "left" | "right"][] = [
        ["Date", colWidths.date, "left"],
        ["Description / Ref", colWidths.desc, "left"],
        ["Debit", colWidths.debit, "right"],
        ["Credit", colWidths.credit, "right"],
        ["Balance", colWidths.balance, "right"],
      ];
      for (const [label, w, align] of cols) {
        doc.text(label, x + 2, y, { width: w - 4, align });
        x += w;
      }
      doc.moveTo(left, y + 13).lineTo(left + pageWidth, y + 13).stroke();
      return y + rowHeight;
    }

    function ensureSpace(minHeight: number) {
      if (doc.y + minHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    }

    for (const account of accounts) {
      ensureSpace(80);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`${account.code} — ${account.name}`, left, doc.y, { width: pageWidth, continued: true })
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#666")
        .text(`  (${account.type})`, { align: "left" });
      doc.fillColor("#000");
      doc.moveDown(0.3);

      if (account.journalLines.length === 0) {
        doc.font("Helvetica").fontSize(9).fillColor("#888").text("No transactions", left, doc.y);
        doc.fillColor("#000");
        doc.moveDown(0.8);
        continue;
      }

      let y = drawHeaderRow(doc.y);
      const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
      let runningBalance = 0;

      doc.font("Helvetica").fontSize(9);
      for (const line of account.journalLines) {
        const amount = Number(line.amount);
        const delta = line.type === "DEBIT" ? amount : -amount;
        runningBalance += isDebitNormal ? delta : -delta;

        const { description, reference } = line.journalEntry;
        const descText = reference && !description.includes(reference) ? `${description} (${reference})` : description;
        const descHeight = doc.heightOfString(descText, { width: colWidths.desc - 4 });
        const thisRowHeight = Math.max(rowHeight, descHeight + 6);

        doc.y = y;
        ensureSpace(thisRowHeight + 20);
        if (doc.y !== y) y = doc.y; // a page break moved us to the top of a new page

        let x = left;
        const cells: [string, number, "left" | "right"][] = [
          [line.journalEntry.entryDate.toISOString().slice(0, 10), colWidths.date, "left"],
          [descText, colWidths.desc, "left"],
          [line.type === "DEBIT" ? formatCurrency(amount, currency) : "", colWidths.debit, "right"],
          [line.type === "CREDIT" ? formatCurrency(amount, currency) : "", colWidths.credit, "right"],
          [formatCurrency(runningBalance, currency), colWidths.balance, "right"],
        ];
        for (const [text, w, align] of cells) {
          doc.text(text, x + 2, y, { width: w - 4, align });
          x += w;
        }
        y += thisRowHeight;
      }

      doc.y = y;
      doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
      doc.moveDown(0.2);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(`Closing balance: ${formatCurrency(Number(account.balance), currency)}`, left, doc.y, {
          width: pageWidth,
          align: "right",
        });
      doc.moveDown(1);
    }

    doc.end();
  });
}

export async function listJournalEntries(businessId: string, params: { page: number; pageSize: number }) {
  const [items, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { businessId },
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.journalEntry.count({ where: { businessId } }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}
