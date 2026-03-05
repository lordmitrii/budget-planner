import { render, screen } from "@testing-library/react";
import TimelinePanel from "./TimelinePanel";
import type { DashboardPayload } from "@shared/types";

const dashboard: DashboardPayload = {
  baseCurrency: "GBP",
  horizonMonths: 24,
  netWorthBase: 12000,
  lastClosedMonth: "2026-03-01",
  varianceLastMonthBase: 100,
  accounts: [],
  drivers: [],
  corrections: [],
  projection: {
    runId: "run-1",
    horizonMonths: 24,
    points: [],
  },
  timeline: [
    {
      month: "2026-03-01",
      totalActualBase: 10000,
      totalProjectedBase: 10100,
      varianceBase: -100,
      isFuture: false,
    },
  ],
  scenarioSummary: {
    inflowBase: 0,
    outflowBase: 0,
    netBase: 0,
  },
  selectedSnapshotMonth: "2026-03-01",
};

describe("TimelinePanel", () => {
  it("renders timeline heading", () => {
    render(<TimelinePanel dashboard={dashboard} />);
    expect(screen.getByText(/actual vs projected timeline/i)).toBeInTheDocument();
  });
});
