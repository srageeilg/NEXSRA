"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  outstandingBalance: string;
  _count: { purchaseOrders: number };
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useSuppliers(params: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Supplier>>("/suppliers", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSupplierInput) =>
      (await apiClient.post<ApiResponse<Supplier>>("/suppliers", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create supplier"),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateSupplierInput> & { id: string }) =>
      (await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update supplier"),
  });
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deactivated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to deactivate supplier"),
  });
}
