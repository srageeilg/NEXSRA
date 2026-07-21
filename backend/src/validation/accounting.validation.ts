import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    code: z.string().min(1).max(30),
    type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  }),
});

export const createJournalEntrySchema = z.object({
  body: z
    .object({
      description: z.string().min(1).max(300),
      reference: z.string().max(120).optional(),
      entryDate: z.coerce.date().optional(),
      lines: z
        .array(
          z.object({
            accountId: z.string().uuid(),
            type: z.enum(["DEBIT", "CREDIT"]),
            amount: z.coerce.number().positive(),
          }),
        )
        .min(2),
    })
    .refine(
      (data) => {
        const debit = data.lines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + l.amount, 0);
        const credit = data.lines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + l.amount, 0);
        return Math.abs(debit - credit) < 0.01;
      },
      { message: "Total debits must equal total credits" },
    ),
});

export const createExpenseCategorySchema = z.object({
  body: z.object({ name: z.string().min(1).max(120) }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid(),
    title: z.string().min(1).max(200),
    amount: z.coerce.number().positive(),
    expenseDate: z.coerce.date().optional(),
    isRecurring: z.coerce.boolean().default(false),
    recurrenceRule: z.string().max(60).optional(),
    attachmentUrl: z.string().max(500).optional(),
  }),
});

export const listExpensesQuerySchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
    categoryId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateExpenseStatusSchema = z.object({
  body: z.object({ status: z.enum(["APPROVED", "REJECTED", "PAID"]) }),
  params: z.object({ id: z.string().uuid() }),
});
