"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  branch?: { id: string; name: string } | null;
  _count: { stocks: number };
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await apiClient.get<ApiResponse<Warehouse[]>>("/warehouses")).data.data,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; address?: string }) =>
      (await apiClient.post<ApiResponse<Warehouse>>("/warehouses", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create warehouse"),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; code?: string; address?: string; isActive?: boolean }) =>
      (await apiClient.patch<ApiResponse<Warehouse>>(`/warehouses/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update warehouse"),
  });
}
