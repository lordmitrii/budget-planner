import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauriApi";
import { formatMoney } from "@/lib/money";
import { formatMonth } from "@/lib/date";
import { useAppStore, type Screen } from "@/state/useAppStore";
import type {
  AccountInput,
  DriverInput,
  FxFallbackInput,
  MonthlyCloseInput,
  QuickCorrectionInput,
  SeedImportInput,
  TsvImportInput,
} from "@shared/types";
import OverviewPanel from "@/components/OverviewPanel";
import MonthlyClosePanel from "@/components/MonthlyClosePanel";
import DriversPanel from "@/components/DriversPanel";
import TimelinePanel from "@/components/TimelinePanel";
import SnapshotPanel from "@/components/SnapshotPanel";
import CorrectionsPanel from "@/components/CorrectionsPanel";
import DataPanel from "@/components/DataPanel";
import SettingsPanel from "@/components/SettingsPanel";

const screens: Array<{ id: Screen; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "monthly-close", label: "Monthly Close" },
  { id: "drivers", label: "Forecast Drivers" },
  { id: "timeline", label: "Timeline" },
  { id: "snapshot", label: "Snapshot" },
  { id: "corrections", label: "Corrections" },
  { id: "data", label: "Data" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const queryClient = useQueryClient();
  const { screen, setScreen, horizonMonths, setHorizonMonths, selectedMonth, setSelectedMonth } = useAppStore();

  const initQuery = useQuery({
    queryKey: ["init-app"],
    queryFn: api.initApp,
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", horizonMonths],
    queryFn: () => api.getDashboard(horizonMonths),
    enabled: initQuery.isSuccess,
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: api.listAccounts,
    enabled: initQuery.isSuccess,
  });

  const snapshotQuery = useQuery({
    queryKey: ["manager-snapshot"],
    queryFn: api.getManagerSnapshot,
    enabled: initQuery.isSuccess,
  });

  const fxSettingsQuery = useQuery({
    queryKey: ["fx-settings"],
    queryFn: api.getFxSettings,
    enabled: initQuery.isSuccess,
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["fx-settings"] }),
    ]);
  };

  const upsertAccountMutation = useMutation({
    mutationFn: (input: AccountInput) => api.upsertAccount(input),
    onSuccess: refreshAll,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => api.deleteAccount(id),
    onSuccess: refreshAll,
  });

  const monthlyCloseMutation = useMutation({
    mutationFn: (input: MonthlyCloseInput) => api.setMonthlyClose(input),
    onSuccess: refreshAll,
  });

  const upsertDriverMutation = useMutation({
    mutationFn: (input: DriverInput) => api.upsertDriver(input),
    onSuccess: refreshAll,
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: string) => api.deleteDriver(id),
    onSuccess: refreshAll,
  });

  const applyCorrectionMutation = useMutation({
    mutationFn: (input: QuickCorrectionInput) => api.applyQuickCorrection(input),
    onSuccess: refreshAll,
  });

  const deleteCorrectionMutation = useMutation({
    mutationFn: (id: string) => api.deleteQuickCorrection(id),
    onSuccess: refreshAll,
  });

  const recomputeProjectionMutation = useMutation({
    mutationFn: () => api.recomputeProjection({ horizonMonths }),
    onSuccess: refreshAll,
  });

  const importSeedMutation = useMutation({
    mutationFn: (input: SeedImportInput) => api.importSeedJson(input),
    onSuccess: refreshAll,
  });

  const importTsvMutation = useMutation({
    mutationFn: (input: TsvImportInput) => api.importExcelTsv(input),
    onSuccess: refreshAll,
  });

  const exportBackupMutation = useMutation({
    mutationFn: api.exportBackup,
  });

  const importBackupMutation = useMutation({
    mutationFn: (json: string) => api.importBackup(json),
    onSuccess: refreshAll,
  });

  const updateFxFallbacksMutation = useMutation({
    mutationFn: (input: FxFallbackInput) => api.updateFxFallbacks(input),
    onSuccess: refreshAll,
  });

  const refreshFxRatesMutation = useMutation({
    mutationFn: api.refreshFxRates,
    onSuccess: refreshAll,
  });

  const dashboard = dashboardQuery.data;
  const accounts = accountsQuery.data || [];
  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);

  const headerCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: "Net Worth",
        value: formatMoney(dashboard.netWorthBase, dashboard.baseCurrency),
        hint: dashboard.lastClosedMonth ? `Last close: ${formatMonth(dashboard.lastClosedMonth)}` : "No close yet",
      },
      {
        label: "Forecast Horizon",
        value: `${dashboard.horizonMonths} months`,
        hint: "Default planning window",
      },
      {
        label: "Last Variance",
        value: formatMoney(dashboard.varianceLastMonthBase || 0, dashboard.baseCurrency),
        hint: dashboard.lastClosedMonth ? `Month: ${formatMonth(dashboard.lastClosedMonth)}` : "No variance yet",
      },
      {
        label: "Scenario Net",
        value: formatMoney(dashboard.scenarioSummary.netBase, dashboard.baseCurrency),
        hint: "Inflow minus outflow",
      },
    ];
  }, [dashboard]);

  return (
    <div className="desktop-app">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="top panel">
        <div>
          <p className="eyebrow">Desktop Monthly Balance Planner</p>
          <h1>Balance Planner</h1>
          <p className="subtitle">
            Monthly close + scenario forecasting across bank accounts and currencies.
          </p>
        </div>
        <div className="top-controls">
          <label>
            Horizon
            <select
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
            >
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
              <option value={36}>36 months</option>
            </select>
          </label>
          <label>
            Working Month
            <input
              type="month"
              value={selectedMonth.slice(0, 7)}
              onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
            />
          </label>
          <button
            type="button"
            className="btn primary"
            disabled={recomputeProjectionMutation.isPending}
            onClick={() => recomputeProjectionMutation.mutate()}
          >
            Recompute Projection
          </button>
        </div>
      </header>

      {dashboard && (
        <section className="stats-grid">
          {headerCards.map((card) => (
            <article className="panel stat" key={card.label}>
              <p className="label">{card.label}</p>
              <p className="value">{card.value}</p>
              <p className="hint">{card.hint}</p>
            </article>
          ))}
        </section>
      )}

      <nav className="panel nav-strip">
        {screens.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-btn ${item.id === screen ? "active" : ""}`}
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main>
        {(initQuery.isLoading || dashboardQuery.isLoading || accountsQuery.isLoading) && (
          <section className="panel">Loading app data...</section>
        )}

        {(initQuery.isError || dashboardQuery.isError || accountsQuery.isError) && (
          <section className="panel error">Failed to load data. Ensure Tauri backend is running.</section>
        )}

        {dashboard && accounts && (
          <>
            {screen === "overview" && (
              <OverviewPanel
                dashboard={dashboard}
                accounts={accounts}
                onUpsertAccount={(input) => upsertAccountMutation.mutateAsync(input)}
                onDeleteAccount={(id) => deleteAccountMutation.mutateAsync(id)}
              />
            )}

            {screen === "monthly-close" && (
              <MonthlyClosePanel
                dashboard={dashboard}
                accounts={activeAccounts}
                selectedMonth={selectedMonth}
                onSubmitClose={(input) => monthlyCloseMutation.mutateAsync(input)}
              />
            )}

            {screen === "drivers" && (
              <DriversPanel
                dashboard={dashboard}
                accounts={activeAccounts}
                onUpsertDriver={(input) => upsertDriverMutation.mutateAsync(input)}
                onDeleteDriver={(id) => deleteDriverMutation.mutateAsync(id)}
              />
            )}

            {screen === "timeline" && <TimelinePanel dashboard={dashboard} />}

            {screen === "snapshot" && snapshotQuery.data && <SnapshotPanel snapshot={snapshotQuery.data} />}

            {screen === "snapshot" && snapshotQuery.isLoading && (
              <section className="panel">Building snapshot...</section>
            )}

            {screen === "snapshot" && snapshotQuery.isError && (
              <section className="panel error">Failed to build snapshot.</section>
            )}

            {screen === "corrections" && (
              <CorrectionsPanel
                dashboard={dashboard}
                accounts={activeAccounts}
                onApplyCorrection={(input) => applyCorrectionMutation.mutateAsync(input)}
                onDeleteCorrection={(id) => deleteCorrectionMutation.mutateAsync(id)}
              />
            )}

            {screen === "data" && (
              <DataPanel
                onImportSeed={(input) => importSeedMutation.mutateAsync(input)}
                onImportTsv={(input) => importTsvMutation.mutateAsync(input)}
                onExportBackup={() => exportBackupMutation.mutateAsync()}
                onImportBackup={(json) => importBackupMutation.mutateAsync(json)}
              />
            )}

            {screen === "settings" && fxSettingsQuery.data && (
              <SettingsPanel
                settings={fxSettingsQuery.data}
                onSaveFallbacks={(input) => updateFxFallbacksMutation.mutateAsync(input)}
                onRefreshFx={() => refreshFxRatesMutation.mutateAsync()}
              />
            )}

            {screen === "settings" && fxSettingsQuery.isLoading && (
              <section className="panel">Loading settings...</section>
            )}

            {screen === "settings" && fxSettingsQuery.isError && (
              <section className="panel error">Failed to load settings.</section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
