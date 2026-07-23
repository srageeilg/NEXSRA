// ISO 4217 has no glyph for NPR, so Intl's "currency" style falls back to printing
// the raw code ("NPR 1,150.00"). Map the currencies we actually support to the
// symbol people expect to see instead — kept in sync with the frontend's formatCurrency.
const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: "Rs",
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function formatCurrency(amount: number, currency = "NPR"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (symbol) {
    const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      amount || 0,
    );
    return `${symbol} ${formatted}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}
