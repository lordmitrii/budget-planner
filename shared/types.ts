export type Currency = "GBP" | "EUR" | "USD";
export type AccountType = "bank" | "cash" | "savings" | "investment" | "receivable";
export type DriverKind = "recurring" | "planned_event";
export type RepeatRule = "monthly" | "quarterly" | "yearly" | "once";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  type: AccountType;
  isActive: boolean;
  createdAt: string;
  currentBalance?: number;
}

export interface AccountInput {
  id?: string;
  name: string;
  currency: Currency;
  type: AccountType;
  isActive?: boolean;
}

export interface FxRateMonthly {
  month: string;
  currency: Currency;
  toGbp: number;
}

export interface MonthlyClose {
  month: string;
  accountId: string;
  closingBalance: number;
  note?: string;
  createdAt: string;
}

export interface MonthlyCloseInput {
  month: string;
  note?: string;
  closes: Array<{
    accountId: string;
    closingBalance: number;
    note?: string;
  }>;
}

export interface MonthlyCloseResult {
  month: string;
  totalProjectedBefore: number;
  totalActual: number;
  totalVariance: number;
  accountVariances: VariancePoint[];
  projectionRunId: string;
}

export interface Driver {
  id: string;
  accountId: string;
  kind: DriverKind;
  label: string;
  amount: number;
  currency: Currency;
  startMonth: string;
  endMonth?: string | null;
  repeatRule: RepeatRule;
  isActive: boolean;
}

export interface DriverInput {
  id?: string;
  accountId: string;
  kind: DriverKind;
  label: string;
  amount: number;
  currency: Currency;
  startMonth: string;
  endMonth?: string | null;
  repeatRule: RepeatRule;
  isActive?: boolean;
}

export interface QuickCorrection {
  id: string;
  effectiveMonth: string;
  accountId: string;
  delta: number;
  currency: Currency;
  reason?: string;
  createdAt: string;
}

export interface QuickCorrectionInput {
  id?: string;
  effectiveMonth: string;
  accountId: string;
  delta: number;
  currency: Currency;
  reason?: string;
}

export interface ProjectionRequest {
  horizonMonths?: number;
  startMonth?: string;
}

export interface ProjectedPoint {
  runId: string;
  month: string;
  accountId: string;
  projectedBalance: number;
  source: "baseline" | "driver" | "rebased";
}

export interface ProjectionResult {
  runId: string;
  horizonMonths: number;
  points: ProjectedPoint[];
}

export interface VariancePoint {
  month: string;
  accountId: string;
  projected: number;
  actual: number;
  variance: number;
}

export interface ScenarioSummary {
  inflowBase: number;
  outflowBase: number;
  netBase: number;
}

export interface TimelinePoint {
  month: string;
  totalActualBase: number | null;
  totalProjectedBase: number;
  varianceBase: number | null;
  isFuture: boolean;
}

export interface DashboardPayload {
  baseCurrency: Currency;
  horizonMonths: number;
  netWorthBase: number;
  lastClosedMonth?: string | null;
  varianceLastMonthBase?: number | null;
  accounts: Account[];
  drivers: Driver[];
  corrections: QuickCorrection[];
  projection: ProjectionResult;
  timeline: TimelinePoint[];
  scenarioSummary: ScenarioSummary;
  selectedSnapshotMonth?: string | null;
}

export interface ManagerSnapshotRow {
  accountId: string;
  accountName: string;
  currency: Currency;
  previousBalance: number;
  previousSource: "actual" | "projected";
  currentBalance: number;
  currentSource: "actual" | "projected";
  nextProjectedBalance: number;
}

export interface ManagerSnapshotPayload {
  baseCurrency: Currency;
  previousMonth: string;
  currentMonth: string;
  nextMonth: string;
  rows: ManagerSnapshotRow[];
  totalPreviousBase: number;
  totalCurrentBase: number;
  totalNextProjectedBase: number;
}

export interface SeedImportInput {
  json: string;
}

export interface TsvImportInput {
  tsv: string;
}

export interface ImportResult {
  importedAccounts: number;
  importedHistoryPoints: number;
  message: string;
}

export interface InitPayload {
  dbPath: string;
  appVersion: string;
  baseCurrency: Currency;
  selectedSnapshotMonth?: string | null;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  appSettings: Record<string, string>;
  accounts: Account[];
  fxRatesMonthly: FxRateMonthly[];
  monthlyActualCloses: MonthlyClose[];
  drivers: Driver[];
  quickCorrections: QuickCorrection[];
  projection: ProjectionResult;
}
