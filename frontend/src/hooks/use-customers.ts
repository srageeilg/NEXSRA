"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: string;
  loyaltyPoints: number;
  isActive: boolean;
  outstandingBalance: string;
  _count: { salesOrders: number; invoices: number };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useCustomers(params: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Customer>>("/customers", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  openingBalance?: number;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomerInput) =>
      (await apiClient.post<ApiResponse<Customer>>("/customers", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create customer"),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateCustomerInput> & { id: string }) =>
      (await apiClient.patch<ApiResponse<Customer>>(`/customers/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update customer"),
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deactivated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to deactivate customer"),
  });
}
