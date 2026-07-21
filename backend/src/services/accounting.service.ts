import { AccountType, JournalEntryType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

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
