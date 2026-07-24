"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Account {
  id: string;
  name: string;
  code: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  balance: string;
}

export interface JournalLine {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: string;
  account: Account;
}

export interface JournalEntry {
  id: string;
  description: string;
  reference: string | null;
  entryDate: string;
  lines: JournalLine[];
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await apiClient.get<ApiResponse<Account[]>>("/accounting/accounts")).data.data,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; type: Account["type"] }) =>
      (await apiClient.post<ApiResponse<Account>>("/accounting/accounts", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create account"),
  });
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useJournalEntries(params: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["journal-entries", params],
    queryFn: async () =>
      (await apiClient.get<PaginatedResponse<JournalEntry>>("/accounting/journal-entries", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export type AccountingReportKind = "ledger" | "trial-balance" | "balance-sheet" | "income-statement";

const REPORT_ENDPOINTS: Record<AccountingReportKind, { path: string; filename: string }> = {
  ledger: { path: "/accounting/ledger/pdf", filename: "general-ledger.pdf" },
  "trial-balance": { path: "/accounting/trial-balance/pdf", filename: "trial-balance.pdf" },
  "balance-sheet": { path: "/accounting/balance-sheet/pdf", filename: "balance-sheet.pdf" },
  "income-statement": { path: "/accounting/income-statement/pdf", filename: "income-statement.pdf" },
};

/** Downloads an accounting report PDF through the authenticated API client (a plain <a href> can't carry the bearer token). */
export async function downloadAccountingReportPdf(kind: AccountingReportKind) {
  const { path, filename } = REPORT_ENDPOINTS[kind];
  const response = await apiClient.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      lines: { accountId: string; type: "DEBIT" | "CREDIT"; amount: number }[];
    }) => (await apiClient.post<ApiResponse<JournalEntry>>("/accounting/journal-entries", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Journal entry recorded");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to record journal entry"),
  });
}
