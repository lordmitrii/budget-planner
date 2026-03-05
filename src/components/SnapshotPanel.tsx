import { useMemo, useState } from "react";
import type { ManagerSnapshotPayload } from "@shared/types";
import { formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";

interface SnapshotPanelProps {
  snapshot: ManagerSnapshotPayload;
}

function sourceLabel(source: "actual" | "projected"): string {
  return source === "actual" ? "Actual" : "Projected";
}

export default function SnapshotPanel({ snapshot }: SnapshotPanelProps) {
  const [copyStatus, setCopyStatus] = useState<string>("");

  const rows = useMemo(
    () =>
      snapshot.rows.map((row) => ({
        accountId: row.accountId,
        accountName: row.accountName,
        currency: row.currency,
        previous: formatMoney(row.previousBalance, row.currency),
        current: formatMoney(row.currentBalance, row.currency),
        next: formatMoney(row.nextProjectedBalance, row.currency),
        previousSource: sourceLabel(row.previousSource),
        currentSource: sourceLabel(row.currentSource),
      })),
    [snapshot.rows],
  );

  async function copyTsv() {
    const lines = [
      [
        "Account",
        `${snapshot.previousMonth.slice(0, 7)} (${formatMonth(snapshot.previousMonth)})`,
        "Prev Source",
        `${snapshot.currentMonth.slice(0, 7)} (${formatMonth(snapshot.currentMonth)})`,
        "Current Source",
        `${snapshot.nextMonth.slice(0, 7)} (${formatMonth(snapshot.nextMonth)})`,
      ].join("\t"),
      ...snapshot.rows.map((row) =>
        [
          `${row.accountName} (${row.currency})`,
          row.previousBalance.toFixed(2),
          sourceLabel(row.previousSource),
          row.currentBalance.toFixed(2),
          sourceLabel(row.currentSource),
          row.nextProjectedBalance.toFixed(2),
        ].join("\t"),
      ),
      [
        `TOTAL (${snapshot.baseCurrency})`,
        snapshot.totalPreviousBase.toFixed(2),
        "",
        snapshot.totalCurrentBase.toFixed(2),
        "",
        snapshot.totalNextProjectedBase.toFixed(2),
      ].join("\t"),
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyStatus("Snapshot TSV copied.");
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Manager Snapshot</h2>
          <p className="hint">Previous, current, and next month in one shareable grid.</p>
        </div>

        <div className="actions-row">
          <button className="btn primary" type="button" onClick={copyTsv}>
            Copy TSV
          </button>
          {copyStatus && <p className="hint">{copyStatus}</p>}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>{formatMonth(snapshot.previousMonth)}</th>
                <th>Prev Source</th>
                <th>{formatMonth(snapshot.currentMonth)}</th>
                <th>Current Source</th>
                <th>{formatMonth(snapshot.nextMonth)} (Projected)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.accountId}>
                  <td>
                    {row.accountName} ({row.currency})
                  </td>
                  <td>{row.previous}</td>
                  <td>{row.previousSource}</td>
                  <td>{row.current}</td>
                  <td>{row.currentSource}</td>
                  <td>{row.next}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>TOTAL ({snapshot.baseCurrency})</strong>
                </td>
                <td>
                  <strong>{formatMoney(snapshot.totalPreviousBase, snapshot.baseCurrency)}</strong>
                </td>
                <td />
                <td>
                  <strong>{formatMoney(snapshot.totalCurrentBase, snapshot.baseCurrency)}</strong>
                </td>
                <td />
                <td>
                  <strong>{formatMoney(snapshot.totalNextProjectedBase, snapshot.baseCurrency)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
