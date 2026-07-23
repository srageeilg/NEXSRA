const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunkToWords(n % 100)}` : ""}`;
}

/** Converts an integer to words using the Indian numbering system (Lakh/Crore),
 * the convention used in Nepal alongside standard Thousand/Hundred groupings. */
function integerToWords(n: number): string {
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${chunkToWords(crore)} Crore`);
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`);
  if (rest) parts.push(chunkToWords(rest));

  return parts.join(" ");
}

/** e.g. 1150.5 -> "Rupees One Thousand One Hundred Fifty And Fifty Paisa Only" */
export function amountInWords(amount: number): string {
  const value = Math.max(0, amount);
  const rupees = Math.floor(value);
  const paisa = Math.round((value - rupees) * 100);

  let result = `Rupees ${integerToWords(rupees)}`;
  if (paisa > 0) result += ` And ${integerToWords(paisa)} Paisa`;
  return `${result} Only`;
}
