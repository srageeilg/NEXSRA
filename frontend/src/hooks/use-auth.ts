"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";
import { useAuthStore, AuthUser } from "@/store/auth-store";

interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface LoginResult {
  requiresTwoFactor?: boolean;
  data: { userId?: string; accessToken?: string; user?: AuthUser };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<LoginResult>("/auth/login", input);
      return data;
    },
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        toast.info("Enter your two-factor authentication code");
        return;
      }
      if (data.data.accessToken && data.data.user) {
        setSession(data.data.accessToken, data.data.user);
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Login failed");
    },
  });
}

interface RegisterInput {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export function useRegisterBusiness() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await apiClient.post<ApiResponse<{ businessId: string; userId: string }>>(
        "/auth/register",
        input,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Business registered! Check your email to verify your account.");
      router.push("/login");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Registration failed");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await apiClient.post<ApiResponse<null>>("/auth/forgot-password", { email });
      return data;
    },
    onSuccess: (data) => toast.success(data.message ?? "Reset link sent"),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Something went wrong"),
  });
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) => {
      const { data } = await apiClient.post<ApiResponse<null>>("/auth/reset-password", input);
      return data;
    },
    onSuccess: () => {
      toast.success("Password reset. Please log in.");
      router.push("/login");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Reset failed"),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await apiClient.get<ApiResponse<null>>(`/auth/verify-email`, { params: { token } });
      return data;
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  return useMutation({
    mutationFn: async () => apiClient.post("/auth/logout"),
    onSuccess: () => {
      clearSession();
      router.push("/login");
    },
  });
}
