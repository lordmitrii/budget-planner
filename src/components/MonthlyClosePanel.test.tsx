import { fireEvent, render, screen } from "@testing-library/react";
import MonthlyClosePanel from "./MonthlyClosePanel";
import type { Account, DashboardPayload } from "@shared/types";

const accounts: Account[] = [
  {
    id: "a1",
    name: "Monzo",
    currency: "GBP",
    type: "bank",
    isActive: true,
    createdAt: "2026-01-01T00:00:00",
    currentBalance: 1000,
  },
];

const dashboard: DashboardPayload = {
  baseCurrency: "GBP",
  horizonMonths: 24,
  netWorthBase: 1000,
  lastClosedMonth: null,
  varianceLastMonthBase: null,
  accounts,
  drivers: [],
  corrections: [],
  projection: {
    runId: "run-1",
    horizonMonths: 24,
    points: [{ runId: "run-1", month: "2026-03-01", accountId: "a1", projectedBalance: 1200, source: "driver" }],
  },
  timeline: [],
  scenarioSummary: {
    inflowBase: 0,
    outflowBase: 0,
    netBase: 0,
  },
  selectedSnapshotMonth: "2026-03-01",
};

describe("MonthlyClosePanel", () => {
  it("submits close values for selected month", async () => {
    const onSubmitClose = vi.fn().mockResolvedValue({
      month: "2026-03-01",
      totalProjectedBefore: 1200,
      totalActual: 1100,
      totalVariance: -100,
      accountVariances: [],
      projectionRunId: "run-2",
    });

    render(
      <MonthlyClosePanel
        dashboard={dashboard}
        accounts={accounts}
        selectedMonth="2026-03-01"
        onSubmitClose={onSubmitClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /commit month close/i }));

    expect(onSubmitClose).toHaveBeenCalledWith({
      month: "2026-03-01",
      closes: [{ accountId: "a1", closingBalance: 1200 }],
    });
  });
});
