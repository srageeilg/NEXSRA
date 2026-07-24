import { ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { ensureDefaultAccounts, getOrCreateExpenseAccount, postAutoJournalEntry, LEDGER_ACCOUNT_CODES } from "./ledger.service";

export async function listExpenseCategories(businessId: string) {
  return prisma.expenseCategory.findMany({ where: { businessId }, orderBy: { name: "asc" } });
}

export async function createExpenseCategory(businessId: string, data: { name: string }) {
  return prisma.expenseCategory.create({ data: { ...data, businessId } });
}

interface ExpenseInput {
  categoryId: string;
  title: string;
  amount: number;
  expenseDate?: Date;
  isRecurring?: boolean;
  recurrenceRule?: string;
  attachmentUrl?: string;
}

export async function createExpense(businessId: string, data: ExpenseInput, submittedById?: string) {
  const category = await prisma.expenseCategory.findFirst({ where: { id: data.categoryId, businessId } });
  if (!category) throw ApiError.notFound("Expense category not found");

  return prisma.expense.create({ data: { ...data, businessId, submittedById }, include: { category: true } });
}

export async function listExpenses(
  businessId: string,
  params: { status?: ExpenseStatus; categoryId?: string; page: number; pageSize: number },
) {
  const where: Prisma.ExpenseWhereInput = {
    businessId,
    ...(params.status && { status: params.status }),
    ...(params.categoryId && { categoryId: params.categoryId }),
  };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true, submittedBy: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function updateExpenseStatus(
  businessId: string,
  id: string,
  status: "APPROVED" | "REJECTED" | "PAID",
  approvedById?: string,
) {
  const expense = await prisma.expense.findFirst({ where: { id, businessId }, include: { category: true } });
  if (!expense) throw ApiError.notFound("Expense not found");

  return prisma.$transaction(
    async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: { status, approvedById: status === "APPROVED" ? approvedById : expense.approvedById },
      });

      // Auto-post to the general ledger only once the expense is actually paid out —
      // that's the point it becomes a real cash transaction, not just an approval.
      if (status === "PAID") {
        await ensureDefaultAccounts(tx, businessId);
        const expenseAccount = await getOrCreateExpenseAccount(tx, businessId, expense.category.name);
        await postAutoJournalEntry(tx, businessId, {
          description: `Expense: ${expense.title}`,
          lines: [
            { code: expenseAccount.code, type: "DEBIT", amount: Number(expense.amount) },
            { code: LEDGER_ACCOUNT_CODES.CASH, type: "CREDIT", amount: Number(expense.amount) },
          ],
        });
      }

      return updated;
    },
    { timeout: 15000 },
  );
}
