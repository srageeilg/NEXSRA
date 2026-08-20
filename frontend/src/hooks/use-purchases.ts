"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
  total: string;
  product: { id: string; name: string; sku: string };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  applyVat: boolean;
  subTotal: string;
  vatRate: string;
  vatAmount: string;
  grandTotal: string;
  amountPaid: string;
  createdAt: string;
  supplier: { id: string; name: string };
  warehouse: { id: string; name: string };
  items: PurchaseOrderItem[];
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function usePurchaseOrders(params: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<PurchaseOrder>>("/purchases", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  items: { productId: string; quantityOrdered: number; unitCost: number; discount: number; taxRate: number }[];
  applyVat: boolean;
  discountTotal?: number;
  expectedDate?: string;
  notes?: string;
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePurchaseOrderInput) =>
      (await apiClient.post<ApiResponse<PurchaseOrder>>("/purchases", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase order created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create purchase order"),
  });
}

export function useReceiveGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: { itemId: string; quantityReceived: number }[] }) =>
      (await apiClient.post<ApiResponse<PurchaseOrder>>(`/purchases/${id}/receive`, { items })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("Goods received");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to receive goods"),
  });
}
