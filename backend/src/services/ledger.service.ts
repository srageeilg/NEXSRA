import { AccountType, JournalEntryType, Prisma } from "@prisma/client";
import { slugify } from "../utils/slugify";

type Tx = Prisma.TransactionClient;

const DEFAULT_ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "1200", name: "Inventory", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "2100", name: "VAT Payable", type: "LIABILITY" },
  { code: "4000", name: "Sales Revenue", type: "INCOME" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "5900", name: "General Expenses", type: "EXPENSE" },
];

export const LEDGER_ACCOUNT_CODES = {
  CASH: "1000",
  ACCOUNTS_RECEIVABLE: "1100",
  INVENTORY: "1200",
  ACCOUNTS_PAYABLE: "2000",
  VAT_PAYABLE: "2100",
  SALES_REVENUE: "4000",
  COGS: "5000",
  GENERAL_EXPENSES: "5900",
} as const;

/** Seeds the standard chart of accounts used by auto-posted entries, if not already present.
 * Safe to call repeatedly — only creates codes that are missing. */
export async function ensureDefaultAccounts(tx: Tx, businessId: string) {
  const existing = await tx.account.findMany({ where: { businessId }, select: { code: true } });
  const existingCodes = new Set(existing.map((a) => a.code));
  const missing = DEFAULT_ACCOUNTS.filter((a) => !existingCodes.has(a.code));
  if (missing.length > 0) {
    await tx.account.createMany({ data: missing.map((a) => ({ ...a, businessId })), skipDuplicates: true });
  }
}

/** Finds (or creates) an EXPENSE-type account for an expense category, so expense postings
 * land on a per-category account rather than one lumped "General Expenses" bucket. */
export async function getOrCreateExpenseAccount(tx: Tx, businessId: string, categoryName: string) {
  const code = `EXP-${slugify(categoryName).toUpperCase().slice(0, 20)}`;
  const existing = await tx.account.findUnique({ where: { businessId_code: { businessId, code } } });
  if (existing) return existing;
  return tx.account.create({ data: { businessId, code, name: categoryName, type: "EXPENSE" } });
}

interface AutoJournalLine {
  code: string;
  type: JournalEntryType;
  amount: number;
}

/** Posts a system-generated, already-balanced journal entry using account codes instead of IDs.
 * Must be called with the same `tx` as the surrounding domain transaction (sale/purchase/expense) —
 * Prisma doesn't support nested interactive transactions. Skips silently if there's nothing to post. */
export async function postAutoJournalEntry(
  tx: Tx,
  businessId: string,
  input: { description: string; reference?: string; lines: AutoJournalLine[] },
) {
  const lines = input.lines.filter((l) => l.amount > 0.004);
  if (lines.length < 2) return null;

  const totalDebits = lines.filter((l) => l.type === "DEBIT").reduce((s, l) => s + l.amount, 0);
  const totalCredits = lines.filter((l) => l.type === "CREDIT").reduce((s, l) => s + l.amount, 0);
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    // An unbalanced auto-entry means a bug in the caller's math — never silently post bad books.
    throw new Error(
      `Auto journal entry "${input.description}" is unbalanced: debits ${totalDebits} vs credits ${totalCredits}`,
    );
  }

  const accounts = await tx.account.findMany({
    where: { businessId, code: { in: [...new Set(lines.map((l) => l.code))] } },
  });
  const accountByCode = new Map(accounts.map((a) => [a.code, a]));

  const entry = await tx.journalEntry.create({
    data: {
      businessId,
      description: input.description,
      reference: input.reference,
      lines: {
        create: lines.map((l) => {
          const account = accountByCode.get(l.code);
          if (!account) throw new Error(`Ledger account with code ${l.code} not found for business ${businessId}`);
          return { accountId: account.id, type: l.type, amount: l.amount };
        }),
      },
    },
  });

  for (const line of lines) {
    const account = accountByCode.get(line.code)!;
    const delta = line.type === "DEBIT" ? line.amount : -line.amount;
    const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE";
    const signedDelta = isDebitNormal ? delta : -delta;
    await tx.account.update({ where: { id: account.id }, data: { balance: { increment: signedDelta } } });
  }

  return entry;
}
