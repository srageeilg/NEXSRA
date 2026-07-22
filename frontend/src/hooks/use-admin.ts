"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface AdminBusiness {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  planName: string;
  planExpiresAt: string | null;
  createdAt: string;
  _count: { users: number; products: number };
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  business?: { id: string; name: string } | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
  business?: { id: string; name: string } | null;
}

export interface SystemStats {
  totalBusinesses: number;
  pendingBusinesses: number;
  totalUsers: number;
  totalProducts: number;
}

export function useSystemStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await apiClient.get<ApiResponse<SystemStats>>("/admin/stats")).data.data,
  });
}

export function useAdminBusinesses() {
  return useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => (await apiClient.get<ApiResponse<AdminBusiness[]>>("/admin/businesses")).data.data,
  });
}

export interface CreateBusinessInput {
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
  planName?: string;
  planExpiresAt?: string;
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBusinessInput) =>
      (await apiClient.post<ApiResponse<{ businessId: string; userId: string }>>("/admin/businesses", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Business created — share the login credentials with your client");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create business"),
  });
}

export function useUpdateBusinessPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planName, planExpiresAt }: { id: string; planName: string; planExpiresAt: string | null }) =>
      (await apiClient.patch<ApiResponse<AdminBusiness>>(`/admin/businesses/${id}/plan`, { planName, planExpiresAt })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Plan updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update plan"),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) =>
      (await apiClient.post<ApiResponse<null>>(`/admin/users/${id}/reset-password`, { newPassword })).data,
    onSuccess: () => toast.success("Password reset — share the new password with the user"),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to reset password"),
  });
}

export function useUpdateBusinessStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "SUSPENDED" | "REJECTED" }) =>
      (await apiClient.patch<ApiResponse<AdminBusiness>>(`/admin/businesses/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business status updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update business"),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await apiClient.get<ApiResponse<AdminUser[]>>("/admin/users")).data.data,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiClient.patch<ApiResponse<AdminUser>>(`/admin/users/${id}`, { isActive })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update user"),
  });
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await apiClient.get<PaginatedResponse<AuditLogEntry>>("/admin/audit-logs")).data,
  });
}
