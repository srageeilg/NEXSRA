"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiResponse } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export interface DashboardSummary {
  todaySales: number;
  monthRevenue: number;
  monthProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingOrders: number;
  purchaseOrdersOpen: number;
  inventoryValue: number;
  salesGraph: { date: string; value: number }[];
  monthlyProfit: { month: string; revenue: number; profit: number }[];
  topSellingProducts: {
    product?: { id: string; name: string; sku: string };
    quantitySold: number;
    revenue: number;
  }[];
  lowStockItems: {
    id: string;
    name: string;
    sku: string;
    currentQty: number;
    threshold: number;
  }[];
  recentTransactions: {
    id: string;
    type: "INVOICE" | "PAYMENT";
    label: string;
    amount: number;
    status: string;
    date: string;
  }[];
}

export function useDashboardSummary() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardSummary>>("/dashboard/summary");
      return data.data;
    },
    enabled: isHydrated,
    staleTime: 30_000, // treat as fresh for 30 s — dashboard data changes at most once per minute
    gcTime: 5 * 60_000,
  });
}
