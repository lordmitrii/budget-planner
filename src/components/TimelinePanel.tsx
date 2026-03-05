import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPayload } from "@shared/types";
import { currentMonthIso } from "@/lib/date";
import { formatMoney } from "@/lib/money";

interface TimelinePanelProps {
  dashboard: DashboardPayload;
}

export default function TimelinePanel({ dashboard }: TimelinePanelProps) {
  const currentMonth = currentMonthIso();

  function windowLabel(month: string): string {
    if (month > currentMonth) return "Future";
    if (month === currentMonth) return "Current";
    if (dashboard.lastClosedMonth && month <= dashboard.lastClosedMonth) return "Closed";
    return "Open";
  }

  return (
    <section className="stack gap-12">
      <article className="panel chart-panel">
        <div className="section-row">
          <h2>Actual vs Projected Timeline</h2>
          <p className="hint">Solid actuals, dashed projection, bars for variance.</p>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={dashboard.timeline} margin={{ top: 20, right: 24, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e6f3" />
              <XAxis dataKey="month" tickFormatter={(month) => String(month).slice(0, 7)} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatMoney(value, dashboard.baseCurrency)}
                labelFormatter={(label: string) => `Month ${String(label).slice(0, 7)}`}
              />
              <Legend />
              <Bar dataKey="varianceBase" fill="#ec6a3f" name="Variance" opacity={0.35} />
              <Line
                type="monotone"
                dataKey="totalActualBase"
                stroke="#1565c0"
                strokeWidth={3}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="totalProjectedBase"
                stroke="#00a287"
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={false}
                name="Projected"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel">
        <h3>Timeline Rows</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Actual</th>
                <th>Projected</th>
                <th>Variance</th>
                <th>Window</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.timeline.map((point) => (
                <tr key={point.month}>
                  <td>{point.month.slice(0, 7)}</td>
                  <td>{point.totalActualBase == null ? "-" : formatMoney(point.totalActualBase, dashboard.baseCurrency)}</td>
                  <td>{formatMoney(point.totalProjectedBase, dashboard.baseCurrency)}</td>
                  <td>
                    {point.varianceBase == null ? "-" : formatMoney(point.varianceBase, dashboard.baseCurrency)}
                  </td>
                  <td>{windowLabel(point.month)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
