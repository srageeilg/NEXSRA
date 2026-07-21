"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  isRecurring: boolean;
  expenseDate: string;
  category: ExpenseCategory;
  submittedBy?: { id: string; firstName: string; lastName: string } | null;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => (await apiClient.get<ApiResponse<ExpenseCategory[]>>("/expenses/categories")).data.data,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) =>
      (await apiClient.post<ApiResponse<ExpenseCategory>>("/expenses/categories", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast.success("Category created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create category"),
  });
}

export function useExpenses(params: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Expense>>("/expenses", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export interface CreateExpenseInput {
  categoryId: string;
  title: string;
  amount: number;
  isRecurring?: boolean;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => (await apiClient.post<ApiResponse<Expense>>("/expenses", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense submitted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to submit expense"),
  });
}

export function useUpdateExpenseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" | "PAID" }) =>
      (await apiClient.patch<ApiResponse<Expense>>(`/expenses/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update expense"),
  });
}
