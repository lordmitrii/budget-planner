import { useState } from "react";
import type { FormEvent } from "react";
import type { Account, AccountInput, DashboardPayload } from "@shared/types";
import { formatMoney } from "@/lib/money";

interface OverviewPanelProps {
  dashboard: DashboardPayload;
  accounts: Account[];
  onUpsertAccount: (input: AccountInput) => Promise<Account>;
}

export default function OverviewPanel({ dashboard, accounts, onUpsertAccount }: OverviewPanelProps) {
  const [form, setForm] = useState<AccountInput>({
    name: "",
    currency: "GBP",
    type: "bank",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await onUpsertAccount({ ...form, name: form.name.trim() });
    setForm({ name: "", currency: "GBP", type: "bank" });
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Scenario Summary</h2>
        </div>
        <div className="stats-grid three">
          <div className="stat-block">
            <p className="label">Monthly Inflow</p>
            <p className="value">{formatMoney(dashboard.scenarioSummary.inflowBase, dashboard.baseCurrency)}</p>
          </div>
          <div className="stat-block">
            <p className="label">Monthly Outflow</p>
            <p className="value">{formatMoney(dashboard.scenarioSummary.outflowBase, dashboard.baseCurrency)}</p>
          </div>
          <div className="stat-block">
            <p className="label">Monthly Net</p>
            <p className="value">{formatMoney(dashboard.scenarioSummary.netBase, dashboard.baseCurrency)}</p>
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="section-row">
          <h2>Accounts</h2>
          <p className="hint">Projected and actual workflows use this account set.</p>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Currency</th>
                <th>Type</th>
                <th>Status</th>
                <th>Current Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.currency}</td>
                  <td>{account.type}</td>
                  <td>{account.isActive ? "Active" : "Inactive"}</td>
                  <td>{formatMoney(account.currentBalance ?? 0, account.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <div className="section-row">
          <h2>Add Account</h2>
          <p className="hint">Use one entry per bank/currency account.</p>
        </div>
        <form className="grid-form" onSubmit={submit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm((v) => ({ ...v, currency: e.target.value as AccountInput["currency"] }))}
            >
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as AccountInput["type"] }))}
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="receivable">Receivable</option>
            </select>
          </label>
          <button className="btn primary" type="submit">Add Account</button>
        </form>
      </article>
    </section>
  );
}
