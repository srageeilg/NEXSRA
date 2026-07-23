import PDFDocument from "pdfkit";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { formatCurrency } from "../utils/format";
import { toBsDate } from "../utils/nepaliDate";
import { amountInWords } from "../utils/amountInWords";

export async function listInvoices(
  businessId: string,
  params: { status?: InvoiceStatus; customerId?: string; page: number; pageSize: number },
) {
  const where: Prisma.InvoiceWhereInput = {
    businessId,
    ...(params.status && { status: params.status }),
    ...(params.customerId && { customerId: params.customerId }),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        grandTotal: true,
        amountPaid: true,
        createdAt: true,
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getInvoiceById(businessId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      business: true,
      items: { include: { product: true, variant: true } },
      payments: true,
    },
  });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return invoice;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_WALLET: "Mobile Wallet",
};

export async function generateInvoicePdf(businessId: string, id: string): Promise<Buffer> {
  const invoice = await getInvoiceById(businessId, id);
  const currency = invoice.business.currency;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // Outer border for the whole invoice
    const top = doc.y;
    const boxHeight = doc.page.height - top - doc.page.margins.bottom;
    doc.rect(left, top, pageWidth, boxHeight).stroke();
    doc.y = top + 14;

    // Header — business identity
    doc.font("Helvetica-Bold").fontSize(18).text(invoice.business.name, left, doc.y, { width: pageWidth, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor("#333");
    if (invoice.business.address) doc.text(invoice.business.address, { width: pageWidth, align: "center" });
    const contactLine = [
      invoice.business.phone ? `Tel/Mob: ${invoice.business.phone}` : null,
      `Email: ${invoice.business.email}`,
      invoice.business.panNumber ? `PAN: ${invoice.business.panNumber}` : null,
    ]
      .filter(Boolean)
      .join("    ");
    doc.text(contactLine, { width: pageWidth, align: "center" });
    doc.moveDown(0.6);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000")
      .text("TAX INVOICE", left, doc.y, { width: pageWidth, align: "center" });
    doc.moveDown(0.5);

    const lineY1 = doc.y;
    doc.moveTo(left + 14, lineY1).lineTo(left + pageWidth - 14, lineY1).stroke();
    doc.moveDown(0.6);

    // Invoice meta — two-column info rows
    const colGap = 20;
    const halfWidth = (pageWidth - 28 - colGap) / 2;
    const metaLeft = left + 14;
    const metaRight = metaLeft + halfWidth + colGap;

    doc.font("Helvetica").fontSize(10).fillColor("#000");

    const bsDate = toBsDate(invoice.issueDate);
    const adDate = invoice.issueDate.toISOString().slice(0, 10);

    function metaRow(labelLeft: string, valueLeft: string, labelRight: string, valueRight: string) {
      const rowY = doc.y;
      doc.font("Helvetica-Bold").text(labelLeft, metaLeft, rowY, { continued: true, width: halfWidth });
      doc.font("Helvetica").text(` ${valueLeft}`, { width: halfWidth });
      doc.font("Helvetica-Bold").text(labelRight, metaRight, rowY, { continued: true, width: halfWidth });
      doc.font("Helvetica").text(` ${valueRight}`, { width: halfWidth });
      doc.y = Math.max(doc.y, rowY + 14);
    }

    metaRow("Invoice No:", invoice.invoiceNumber, "Transaction Date:", `${adDate} (${bsDate} BS)`);
    metaRow(
      "Buyer's PAN No:",
      invoice.customer?.panNumber ?? "-",
      "Bill Issuing Date:",
      `${bsDate} BS`,
    );

    doc.font("Helvetica-Bold").text("Buyer's Name:", metaLeft, doc.y, { continued: true, width: pageWidth - 28 });
    doc.font("Helvetica").text(` ${invoice.customer?.name ?? "Walk-in Customer"}`);
    doc.font("Helvetica-Bold").text("Buyer's Address:", metaLeft, doc.y, { continued: true, width: pageWidth - 28 });
    doc.font("Helvetica").text(` ${invoice.customer?.address ?? "-"}`);

    const paymentMethod = invoice.payments[0]?.method
      ? (PAYMENT_METHOD_LABELS[invoice.payments[0].method] ?? invoice.payments[0].method)
      : "Cash";
    doc.font("Helvetica-Bold").text("Mode of Payment:", metaLeft, doc.y, { continued: true, width: pageWidth - 28 });
    doc.font("Helvetica").text(` ${paymentMethod}`);

    doc.moveDown(0.6);

    // Items table
    const tableX = metaLeft;
    const tableWidth = pageWidth - 28;
    const colWidths = { sn: 30, particulars: tableWidth - 30 - 70 - 90 - 100, qty: 70, rate: 90, total: 100 };
    const rowHeight = 20;

    function drawTableHeader(y: number) {
      doc.font("Helvetica-Bold").fontSize(9.5);
      doc.rect(tableX, y, tableWidth, rowHeight).stroke();
      let x = tableX;
      const headers: [string, number][] = [
        ["S.N.", colWidths.sn],
        ["Particulars", colWidths.particulars],
        ["Quantity", colWidths.qty],
        ["Rate/Unit", colWidths.rate],
        ["Total (Rs.)", colWidths.total],
      ];
      for (const [label, w] of headers) {
        doc.text(label, x + 3, y + 6, { width: w - 6, align: label === "Particulars" ? "left" : "center" });
        if (x !== tableX) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
        x += w;
      }
      return y + rowHeight;
    }

    let y = drawTableHeader(doc.y);

    doc.font("Helvetica").fontSize(9.5);
    invoice.items.forEach((item, index) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 160) {
        doc.addPage();
        y = drawTableHeader(doc.page.margins.top);
      }
      const productName = item.product?.name ?? "Item";
      doc.rect(tableX, y, tableWidth, rowHeight).stroke();
      let x = tableX;
      const cells: [string, number, "left" | "center" | "right"][] = [
        [String(index + 1), colWidths.sn, "center"],
        [productName, colWidths.particulars, "left"],
        [String(item.quantity), colWidths.qty, "center"],
        [formatCurrency(Number(item.unitPrice), currency), colWidths.rate, "right"],
        [formatCurrency(Number(item.total), currency), colWidths.total, "right"],
      ];
      for (const [text, w, align] of cells) {
        doc.text(text, x + 4, y + 6, { width: w - 8, align });
        if (x !== tableX) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
        x += w;
      }
      y += rowHeight;
    });

    doc.y = y + 10;

    // Amount in words — bounded to the table width so it wraps inside the invoice
    // border instead of running out to the page margin on the same visual line
    // as the summary box that follows.
    doc.font("Helvetica-Bold").fontSize(9.5).text("Amount in Words:", tableX, doc.y, { width: tableWidth });
    doc.font("Helvetica").text(amountInWords(Number(invoice.grandTotal)), tableX, doc.y, { width: tableWidth });
    doc.moveDown(1.2);

    // Summary box (right-aligned)
    const summaryWidth = 220;
    const summaryX = tableX + tableWidth - summaryWidth;
    const discountPct =
      Number(invoice.subTotal) > 0 ? (Number(invoice.discountTotal) / Number(invoice.subTotal)) * 100 : 0;

    function summaryRow(label: string, value: string, bold = false) {
      const rowY = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      doc.text(label, summaryX, rowY, { width: summaryWidth - 90 });
      doc.text(value, summaryX + summaryWidth - 90, rowY, { width: 90, align: "right" });
      doc.y = rowY + 15;
    }

    summaryRow("Gross Amount:", formatCurrency(Number(invoice.subTotal), currency));
    summaryRow("Discount:", `${discountPct.toFixed(1)}%`);
    summaryRow("Taxable Value:", formatCurrency(Number(invoice.subTotal) - Number(invoice.discountTotal), currency));
    summaryRow("VAT:", formatCurrency(Number(invoice.taxTotal), currency));
    doc.moveTo(summaryX, doc.y).lineTo(summaryX + summaryWidth, doc.y).stroke();
    doc.moveDown(0.2);
    summaryRow("Grand Total (Rs.):", formatCurrency(Number(invoice.grandTotal), currency), true);

    doc.moveDown(2);

    // Signature area
    const sigY = Math.max(doc.y, doc.page.height - doc.page.margins.bottom - 70);
    doc.font("Helvetica").fontSize(10);
    doc.text("_____________________________", tableX + tableWidth - 220, sigY, { width: 220, align: "center" });
    doc.text(`Seller's Signature for ${invoice.business.name}`, tableX + tableWidth - 220, sigY + 14, {
      width: 220,
      align: "center",
    });

    doc.end();
  });
}
