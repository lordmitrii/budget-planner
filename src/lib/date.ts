export function monthStart(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function addMonths(monthIso: string, delta: number): string {
  const d = new Date(`${monthIso}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return monthStart(d);
}

export function formatMonth(monthIso: string): string {
  const date = new Date(`${monthIso}T00:00:00.000Z`);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function currentMonthIso(): string {
  return monthStart(new Date());
}
