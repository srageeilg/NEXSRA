"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  purchasePrice: string;
  sellingPrice: string;
  lowStockThreshold: number;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  unit?: { id: string; name: string; shortCode: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  totalStock: number;
  createdAt: string;
}

interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", { params });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minimumPrice?: number;
  lowStockThreshold: number;
  trackExpiry?: boolean;
  trackSerial?: boolean;
  trackBatch?: boolean;
  notes?: string;
  isActive?: boolean;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) =>
      (await apiClient.post<ApiResponse<Product>>("/products", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create product"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateProductInput> & { id: string }) =>
      (await apiClient.patch<ApiResponse<Product>>(`/products/${id}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update product"),
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deactivated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to deactivate product"),
  });
}
