import PDFDocument from "pdfkit";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { formatCurrency } from "../utils/format";

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

export async function generateInvoicePdf(businessId: string, id: string): Promise<Buffer> {
  const invoice = await getInvoiceById(businessId, id);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(invoice.business.name, { continued: false });
    doc.fontSize(10).fillColor("#666").text(invoice.business.email);
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(16).text(`Invoice ${invoice.invoiceNumber}`);
    doc.fontSize(10).fillColor("#666").text(`Issued: ${invoice.issueDate.toDateString()}`);
    if (invoice.dueDate) doc.text(`Due: ${invoice.dueDate.toDateString()}`);
    doc.text(`Status: ${invoice.status}`);
    doc.moveDown();

    if (invoice.customer) {
      doc.fillColor("#000").fontSize(11).text("Bill to:");
      doc.fontSize(10).fillColor("#666").text(invoice.customer.name);
      if (invoice.customer.email) doc.text(invoice.customer.email);
      if (invoice.customer.phone) doc.text(invoice.customer.phone);
      doc.moveDown();
    }

    doc.fillColor("#000").fontSize(11).text("Items", { underline: true });
    doc.moveDown(0.5);

    invoice.items.forEach((item) => {
      const productName = item.product?.name ?? "Item";
      doc
        .fontSize(10)
        .fillColor("#000")
        .text(`${productName}  x${item.quantity}`, { continued: true })
        .text(formatCurrency(Number(item.total), invoice.business.currency), { align: "right" });
    });

    doc.moveDown();
    doc.fontSize(10).fillColor("#666");
    doc.text(`Subtotal: ${formatCurrency(Number(invoice.subTotal), invoice.business.currency)}`, { align: "right" });
    doc.text(`Tax: ${formatCurrency(Number(invoice.taxTotal), invoice.business.currency)}`, { align: "right" });
    doc.text(`Discount: -${formatCurrency(Number(invoice.discountTotal), invoice.business.currency)}`, { align: "right" });
    doc
      .fontSize(13)
      .fillColor("#000")
      .text(`Total: ${formatCurrency(Number(invoice.grandTotal), invoice.business.currency)}`, { align: "right" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Paid: ${formatCurrency(Number(invoice.amountPaid), invoice.business.currency)}`, { align: "right" });

    doc.end();
  });
}
