"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children: Category[];
  _count: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  _count: { products: number };
}

export interface Unit {
  id: string;
  name: string;
  shortCode: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<ApiResponse<Category[]>>("/catalog/categories")).data.data,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => (await apiClient.get<ApiResponse<Brand[]>>("/catalog/brands")).data.data,
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => (await apiClient.get<ApiResponse<Unit[]>>("/catalog/units")).data.data,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; parentId?: string | null }) =>
      (await apiClient.post<ApiResponse<Category>>("/catalog/categories", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create category"),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => (await apiClient.post<ApiResponse<Brand>>("/catalog/brands", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create brand"),
  });
}
