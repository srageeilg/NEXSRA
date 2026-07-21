import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "@/store/auth-store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Reads the business currency from the Zustand store automatically.
// Pass an explicit `currency` to override (e.g. for PDF generation).
export function formatCurrency(amount: number | string, currency?: string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const curr = currency ?? useAuthStore.getState().currency ?? "NPR";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(value || 0);
  } catch {
    return `${curr} ${(value || 0).toFixed(2)}`;
  }
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}
