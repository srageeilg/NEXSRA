import crypto from "crypto";

/** Generates a human-readable SKU like "PRD-8K3F2A" from a product name plus a random suffix. */
export function generateSku(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `${prefix}-${suffix}`;
}

/** Generates a 12-digit numeric barcode value (EAN-13 compatible without the check digit). */
export function generateBarcodeValue(): string {
  let digits = "";
  for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

export function generateSequentialNumber(prefix: string, sequence: number, padLength = 5): string {
  return `${prefix}-${String(sequence).padStart(padLength, "0")}`;
}
