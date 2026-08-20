"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  isPosSale: boolean;
  applyVat: boolean;
  subTotal: string;
  vatRate: string;
  vatAmount: string;
  grandTotal: string;
  createdAt: string;
  customer?: { id: string; name: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useSalesOrders(params: { status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["sales-orders", params],
    queryFn: async () => (await apiClient.get<PaginatedResponse<SalesOrder>>("/sales", { params })).data,
    placeholderData: (previous) => previous,
  });
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface PosCheckoutInput {
  customerId?: string;
  warehouseId: string;
  items: CartItem[];
  applyVat: boolean;
  discountTotal?: number;
  payments: { method: string; amount: number; reference?: string }[];
  requiresVcts?: boolean;
  vehicleNumber?: string;
}

export interface CheckoutInvoice {
  id: string;
  invoiceNumber: string;
  grandTotal: string;
  requiresVcts: boolean;
  vehicleNumber: string | null;
  customer?: { name: string; panNumber?: string | null } | null;
  items: { quantity: number; unitPrice: string; total: string; product: { name: string; sku: string } }[];
}

export function usePosCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PosCheckoutInput) =>
      (await apiClient.post<ApiResponse<{ order: SalesOrder; invoice: CheckoutInvoice }>>(
        "/sales/pos/checkout",
        input,
      )).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success(`Sale completed — invoice ${data.data.invoice.invoiceNumber}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Checkout failed"),
  });
}
