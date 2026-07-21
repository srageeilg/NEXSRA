"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface StockRow {
  id: string;
  quantity: number;
  reservedQty: number;
  updatedAt: string;
  product: { id: string; name: string; sku: string; lowStockThreshold: number };
  warehouse: { id: string; name: string };
  variant: { id: string; sku: string; color: string | null; size: string | null } | null;
}

export interface StockMovementRow {
  id: string;
  type: string;
  quantity: number;
  reference: string | null;
  reason: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  fromWarehouse: { id: string; name: string } | null;
  toWarehouse: { id: string; name: string } | null;
  performedBy: { id: string; firstName: string; lastName: string } | null;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useStock(params: { warehouseId?: string; productId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["stock", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<StockRow>>("/inventory/stock", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export function useMovements(params: { productId?: string; warehouseId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["movements", params],
    queryFn: async () =>
      (await apiClient.get<PaginatedResponse<StockMovementRow>>("/inventory/movements", { params })).data,
    placeholderData: (previous) => previous,
  });
}

function useInventoryMutation(endpoint: string, successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      (await apiClient.post<ApiResponse<unknown>>(`/inventory/${endpoint}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(successMessage);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Operation failed"),
  });
}

export const useStockIn = () => useInventoryMutation("stock-in", "Stock added");
export const useStockOut = () => useInventoryMutation("stock-out", "Stock removed");
export const useTransferStock = () => useInventoryMutation("transfer", "Stock transferred");
export const useAdjustStock = () => useInventoryMutation("adjustment", "Stock adjusted");
export const useMarkDamaged = () => useInventoryMutation("damaged", "Marked as damaged");
export const useMarkReturned = () => useInventoryMutation("returned", "Marked as returned");
