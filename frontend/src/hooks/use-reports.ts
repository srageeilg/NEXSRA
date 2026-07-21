"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiResponse } from "@/lib/api-client";

export type ReportKind = "sales" | "purchases" | "inventory" | "customers" | "suppliers" | "expenses" | "employees";

export function useReport<T = unknown>(kind: ReportKind, enabled = true) {
  return useQuery({
    queryKey: ["report", kind],
    queryFn: async () => (await apiClient.get<ApiResponse<T>>(`/reports/${kind}`)).data.data,
    enabled,
  });
}

export async function downloadReportCsv(kind: ReportKind) {
  const response = await apiClient.get(`/reports/${kind}`, { params: { format: "csv" }, responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${kind}-report.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
