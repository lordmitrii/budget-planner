import type { Currency } from "@shared/types";

export function formatMoney(amount: number, currency: Currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
