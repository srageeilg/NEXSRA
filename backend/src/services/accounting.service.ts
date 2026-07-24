import PDFDocument from "pdfkit";
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
    { label: "Code", width: 60 },
    { label: "Account", width: 260 },
    { label: "Debit", width: 100, align: "right" },
    { label: "Credit", width: 100, align: "right" },
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
    { label: "Code", width: 70 },
    { label: "Account", width: 320 },
    { label: "Amount", width: 130, align: "right" },
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
    { label: "Code", width: 70 },
    { label: "Account", width: 320 },
    { label: "Amount", width: 130, align: "right" },
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
