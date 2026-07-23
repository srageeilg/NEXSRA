import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "@/store/auth-store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ISO 4217 has no glyph for NPR, so Intl's "currency" style falls back to printing
// the raw code ("NPR 1,150.00"). Map the currencies we actually support to the
// symbol people expect to see instead.
const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: "Rs",
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

// Reads the business currency from the Zustand store automatically.
// Pass an explicit `currency` to override (e.g. for PDF generation).
export function formatCurrency(amount: number | string, currency?: string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const curr = currency ?? useAuthStore.getState().currency ?? "NPR";
  const symbol = CURRENCY_SYMBOLS[curr];
  if (symbol) {
    const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value || 0,
    );
    return `${symbol} ${formatted}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: curr }).format(value || 0);
  } catch {
    return `${curr} ${(value || 0).toFixed(2)}`;
  }
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}
