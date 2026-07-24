import { Prisma, PaymentDirection, PaymentMethod } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { ensureDefaultAccounts, postAutoJournalEntry, LEDGER_ACCOUNT_CODES } from "./ledger.service";

interface RecordPaymentInput {
  direction: PaymentDirection;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
  customerId?: string;
  supplierId?: string;
  invoiceId?: string;
  purchaseOrderId?: string;
}

export async function recordPayment(businessId: string, input: RecordPaymentInput) {
  return prisma.$transaction(
    async (tx) => {
    const payment = await tx.payment.create({
      data: { businessId, ...input },
    });

    if (input.invoiceId) {
      const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, businessId } });
      if (!invoice) throw ApiError.notFound("Invoice not found");

      const newAmountPaid = Number(invoice.amountPaid) + input.amount;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          status: newAmountPaid >= Number(invoice.grandTotal) ? "PAID" : "PARTIALLY_PAID",
        },
      });
    }

    if (input.purchaseOrderId) {
      const po = await tx.purchaseOrder.findFirst({ where: { id: input.purchaseOrderId, businessId } });
      if (!po) throw ApiError.notFound("Purchase order not found");
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { amountPaid: Number(po.amountPaid) + input.amount },
      });
    }

    if (input.customerId) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
      const lastEntry = await tx.customerLedgerEntry.findFirst({
        where: { customerId: input.customerId },
        orderBy: { createdAt: "desc" },
      });
      const previousBalance = Number(lastEntry?.balance ?? customer.openingBalance);
      await tx.customerLedgerEntry.create({
        data: {
          customerId: input.customerId,
          description: `Payment received (${input.method})`,
          debit: 0,
          credit: input.amount,
          balance: previousBalance - input.amount,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
      });
    }

    if (input.supplierId) {
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } });
      const lastEntry = await tx.supplierLedgerEntry.findFirst({
        where: { supplierId: input.supplierId },
        orderBy: { createdAt: "desc" },
      });
      const previousBalance = Number(lastEntry?.balance ?? supplier.openingBalance);
      await tx.supplierLedgerEntry.create({
        data: {
          supplierId: input.supplierId,
          description: `Payment made (${input.method})`,
          debit: 0,
          credit: input.amount,
          balance: previousBalance - input.amount,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
      });
    }

    // Auto-post to the general ledger — this is the piece that was missing: collecting on
    // an invoice later, or paying a supplier later, must move Cash against Accounts
    // Receivable/Payable just like the initial POS sale or goods receipt does.
    await ensureDefaultAccounts(tx, businessId);
    if (input.direction === "INBOUND" && input.customerId) {
      await postAutoJournalEntry(tx, businessId, {
        description: `Payment received (${input.method})`,
        reference: input.reference,
        lines: [
          { code: LEDGER_ACCOUNT_CODES.CASH, type: "DEBIT", amount: input.amount },
          { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, type: "CREDIT", amount: input.amount },
        ],
      });
    } else if (input.direction === "OUTBOUND" && input.supplierId) {
      await postAutoJournalEntry(tx, businessId, {
        description: `Payment made (${input.method})`,
        reference: input.reference,
        lines: [
          { code: LEDGER_ACCOUNT_CODES.ACCOUNTS_PAYABLE, type: "DEBIT", amount: input.amount },
          { code: LEDGER_ACCOUNT_CODES.CASH, type: "CREDIT", amount: input.amount },
        ],
      });
    }

    return payment;
    },
    { timeout: 15000 },
  );
}

export async function listPayments(
  businessId: string,
  params: { direction?: PaymentDirection; customerId?: string; supplierId?: string; page: number; pageSize: number },
) {
  const where: Prisma.PaymentWhereInput = {
    businessId,
    ...(params.direction && { direction: params.direction }),
    ...(params.customerId && { customerId: params.customerId }),
    ...(params.supplierId && { supplierId: params.supplierId }),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { customer: true, supplier: true, invoice: true, purchaseOrder: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}
