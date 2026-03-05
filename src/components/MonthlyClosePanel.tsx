import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Account, DashboardPayload, MonthlyCloseInput, MonthlyCloseResult } from "@shared/types";
import { formatMoney } from "@/lib/money";

interface MonthlyClosePanelProps {
  dashboard: DashboardPayload;
  accounts: Account[];
  selectedMonth: string;
  onSubmitClose: (input: MonthlyCloseInput) => Promise<MonthlyCloseResult>;
}

export default function MonthlyClosePanel({
  dashboard,
  accounts,
  selectedMonth,
  onSubmitClose,
}: MonthlyClosePanelProps) {
  const projectedByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of dashboard.projection.points) {
      if (point.month === selectedMonth) {
        map.set(point.accountId, point.projectedBalance);
      }
    }
    return map;
  }, [dashboard.projection.points, selectedMonth]);

  const [closeValues, setCloseValues] = useState<Record<string, string>>({});
  const [closeNote, setCloseNote] = useState("");
  const [result, setResult] = useState<MonthlyCloseResult | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const account of accounts) {
      const projected = projectedByAccount.get(account.id) ?? account.currentBalance ?? 0;
      next[account.id] = projected.toFixed(2);
    }
    setCloseValues(next);
    setCloseNote("");
    setResult(null);
  }, [accounts, projectedByAccount, selectedMonth]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const closes = accounts.map((account) => ({
      accountId: account.id,
      closingBalance: Number(closeValues[account.id] ?? 0),
      note: closeNote.trim() || undefined,
    }));

    const response = await onSubmitClose({ month: selectedMonth, note: closeNote.trim() || undefined, closes });
    setResult(response);
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Monthly Close Input</h2>
          <p className="hint">Set actual month-end balances and auto-rebase forecast forward.</p>
        </div>

        <form onSubmit={submit} className="stack gap-12">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Currency</th>
                  <th>Projected</th>
                  <th>Actual Close</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const projected = projectedByAccount.get(account.id) ?? account.currentBalance ?? 0;
                  const actual = Number(closeValues[account.id] ?? projected);
                  const variance = actual - projected;

                  return (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.currency}</td>
                      <td>{formatMoney(projected, account.currency)}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={closeValues[account.id] ?? ""}
                          onChange={(e) =>
                            setCloseValues((prev) => ({
                              ...prev,
                              [account.id]: e.target.value,
                            }))
                          }
                          required
                        />
                      </td>
                      <td className={variance >= 0 ? "positive" : "negative"}>
                        {formatMoney(variance, account.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <label>
            Close Note (optional)
            <textarea
              rows={2}
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder="Example: closed after flat payment, before salary credit"
            />
          </label>

          <button className="btn primary" type="submit">
            Commit Month Close
          </button>
        </form>
      </article>

      {result && (
        <article className="panel">
          <h3>Close Result</h3>
          <p>
            Projected before close: {formatMoney(result.totalProjectedBefore, dashboard.baseCurrency)}
          </p>
          <p>Actual close total: {formatMoney(result.totalActual, dashboard.baseCurrency)}</p>
          <p className={result.totalVariance >= 0 ? "positive" : "negative"}>
            Variance: {formatMoney(result.totalVariance, dashboard.baseCurrency)}
          </p>
          <p className="hint">Projection run id: {result.projectionRunId}</p>
        </article>
      )}
    </section>
  );
}
