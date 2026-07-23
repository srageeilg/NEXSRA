import NepaliDate from "nepali-date-converter";

/** Converts a Gregorian (AD) date to its Bikram Sambat (BS) equivalent, formatted e.g. "07 Shrawan 2083". */
export function toBsDate(date: Date): string {
  return new NepaliDate(date).format("DD MMMM YYYY");
}
