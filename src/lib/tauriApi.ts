import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  AccountInput,
  DashboardPayload,
  Driver,
  DriverInput,
  ImportResult,
  InitPayload,
  MonthlyCloseInput,
  MonthlyCloseResult,
  ProjectionRequest,
  ProjectionResult,
  QuickCorrection,
  QuickCorrectionInput,
  SeedImportInput,
  TsvImportInput,
} from "@shared/types";

export const api = {
  initApp: () => invoke<InitPayload>("init_app"),
  getDashboard: (horizonMonths = 24) => invoke<DashboardPayload>("get_dashboard", { horizonMonths }),
  listAccounts: () => invoke<Account[]>("list_accounts"),
  upsertAccount: (input: AccountInput) => invoke<Account>("upsert_account", { input }),
  setMonthlyClose: (input: MonthlyCloseInput) => invoke<MonthlyCloseResult>("set_monthly_close", { input }),
  applyQuickCorrection: (input: QuickCorrectionInput) => invoke<QuickCorrection>("apply_quick_correction", { input }),
  upsertDriver: (input: DriverInput) => invoke<Driver>("upsert_driver", { input }),
  deleteDriver: (id: string) => invoke<void>("delete_driver", { id }),
  recomputeProjection: (input: ProjectionRequest) => invoke<ProjectionResult>("recompute_projection", { input }),
  importSeedJson: (input: SeedImportInput) => invoke<ImportResult>("import_seed_json", { input }),
  importExcelTsv: (input: TsvImportInput) => invoke<ImportResult>("import_excel_tsv", { input }),
  exportBackup: () => invoke<string>("export_backup"),
  importBackup: (json: string) => invoke<ImportResult>("import_backup", { json }),
};
