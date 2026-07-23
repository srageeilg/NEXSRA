"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  invoicePrefix: string;
  panNumber: string | null;
  status: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: { id: string; key: string; module: string; action: string; label: string }[];
  _count: { users: number };
}

export interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  label: string;
}

export function useBusinessProfile() {
  return useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => (await apiClient.get<ApiResponse<BusinessProfile>>("/settings/business")).data.data,
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BusinessProfile>) =>
      (await apiClient.patch<ApiResponse<BusinessProfile>>("/settings/business", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-profile"] });
      toast.success("Business profile updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update profile"),
  });
}

export function useRoleDefinitions() {
  return useQuery({
    queryKey: ["role-definitions"],
    queryFn: async () => (await apiClient.get<ApiResponse<RoleDefinition[]>>("/settings/roles")).data.data,
  });
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => (await apiClient.get<ApiResponse<Permission[]>>("/settings/permissions")).data.data,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, permissionKeys }: { roleId: string; permissionKeys: string[] }) =>
      (await apiClient.patch<ApiResponse<RoleDefinition>>(`/settings/roles/${roleId}/permissions`, { permissionKeys })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-definitions"] });
      toast.success("Role permissions updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update role"),
  });
}
