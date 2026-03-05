import { useMemo, useState } from "react";
import type { ManagerSnapshotPayload } from "@shared/types";
import { formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";

interface SnapshotPanelProps {
  snapshot: ManagerSnapshotPayload;
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
      })),
    [snapshot.rows],
  );

  async function copyMessage() {
    const lines = [
      `Balance snapshot: ${formatMonth(snapshot.currentMonth)}`,
      `${formatMonth(snapshot.previousMonth)} | ${formatMonth(snapshot.currentMonth)} | ${formatMonth(snapshot.nextMonth)} (Projected)`,
      "",
      ...rows.map(
        (row) => `${row.accountName} (${row.currency}): ${row.previous} -> ${row.current} -> ${row.next}`,
      ),
      "",
      `TOTAL (${snapshot.baseCurrency}): ${formatMoney(snapshot.totalPreviousBase, snapshot.baseCurrency)} -> ${formatMoney(snapshot.totalCurrentBase, snapshot.baseCurrency)} -> ${formatMoney(snapshot.totalNextProjectedBase, snapshot.baseCurrency)}`,
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyStatus("Snapshot message copied.");
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Manager Snapshot</h2>
          <p className="hint">Previous, current, and next month in one shareable grid.</p>
        </div>

        <div className="actions-row">
          <button className="btn primary" type="button" onClick={copyMessage}>
            Copy Snapshot
          </button>
          {copyStatus && <p className="hint">{copyStatus}</p>}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>{formatMonth(snapshot.previousMonth)}</th>
                <th>{formatMonth(snapshot.currentMonth)}</th>
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
                  <td>{row.current}</td>
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
                <td>
                  <strong>{formatMoney(snapshot.totalCurrentBase, snapshot.baseCurrency)}</strong>
                </td>
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
