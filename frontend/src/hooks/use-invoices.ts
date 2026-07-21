"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  grandTotal: string;
  amountPaid: string;
  issueDate: string;
  customer?: { id: string; name: string } | null;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useInvoices(params: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<Invoice>>("/invoices", { params })).data,
    placeholderData: (previous) => previous,
  });
}

/** Downloads the invoice PDF through the authenticated API client (a plain <a href> can't carry the bearer token). */
export async function downloadInvoicePdf(id: string, invoiceNumber: string) {
  const response = await apiClient.get(`/invoices/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${invoiceNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
