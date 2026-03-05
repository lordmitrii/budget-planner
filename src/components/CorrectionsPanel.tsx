import { useState } from "react";
import type { FormEvent } from "react";
import type {
  Account,
  DashboardPayload,
  QuickCorrection,
  QuickCorrectionInput,
} from "@shared/types";
import { formatMoney } from "@/lib/money";

interface CorrectionsPanelProps {
  dashboard: DashboardPayload;
  accounts: Account[];
  onApplyCorrection: (input: QuickCorrectionInput) => Promise<QuickCorrection>;
}

export default function CorrectionsPanel({ dashboard, accounts, onApplyCorrection }: CorrectionsPanelProps) {
  const defaultAccount = accounts[0];
  const [form, setForm] = useState<QuickCorrectionInput>({
    effectiveMonth: new Date().toISOString().slice(0, 7) + "-01",
    accountId: defaultAccount?.id ?? "",
    delta: 0,
    currency: defaultAccount?.currency ?? "GBP",
    reason: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.accountId || !form.delta) return;
    await onApplyCorrection(form);
    setForm((old) => ({ ...old, delta: 0, reason: "" }));
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Add Quick Correction</h2>
          <p className="hint">Small adjustments between monthly close cycles.</p>
        </div>

        <form className="grid-form" onSubmit={submit}>
          <label>
            Month
            <input
              type="month"
              value={form.effectiveMonth.slice(0, 7)}
              onChange={(e) => setForm((v) => ({ ...v, effectiveMonth: `${e.target.value}-01` }))}
            />
          </label>

          <label>
            Account
            <select
              value={form.accountId}
              onChange={(e) => {
                const account = accounts.find((a) => a.id === e.target.value);
                setForm((v) => ({ ...v, accountId: e.target.value, currency: account?.currency ?? v.currency }));
              }}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
          </label>

          <label>
            Delta
            <input
              type="number"
              step="0.01"
              value={form.delta}
              onChange={(e) => setForm((v) => ({ ...v, delta: Number(e.target.value) }))}
            />
          </label>

          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm((v) => ({ ...v, currency: e.target.value as QuickCorrectionInput["currency"] }))}
            >
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label className="wide">
            Reason
            <input
              value={form.reason}
              onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))}
              placeholder="Optional note"
            />
          </label>

          <button className="btn primary" type="submit">
            Apply Correction
          </button>
        </form>
      </article>

      <article className="panel">
        <h3>Correction Log</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Account</th>
                <th>Delta</th>
                <th>Reason</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.corrections.map((correction) => {
                const account = accounts.find((a) => a.id === correction.accountId);
                return (
                  <tr key={correction.id}>
                    <td>{correction.effectiveMonth.slice(0, 7)}</td>
                    <td>{account ? `${account.name} (${account.currency})` : correction.accountId}</td>
                    <td>{formatMoney(correction.delta, correction.currency)}</td>
                    <td>{correction.reason || "-"}</td>
                    <td>{correction.createdAt.replace("T", " ").slice(0, 16)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
