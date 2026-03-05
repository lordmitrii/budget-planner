import { useState } from "react";
import type { FormEvent } from "react";
import type { Account, AccountInput, DashboardPayload } from "@shared/types";
import { formatMoney } from "@/lib/money";

interface OverviewPanelProps {
  dashboard: DashboardPayload;
  accounts: Account[];
  onUpsertAccount: (input: AccountInput) => Promise<Account>;
  onDeleteAccount: (id: string) => Promise<void>;
}

export default function OverviewPanel({
  dashboard,
  accounts,
  onUpsertAccount,
  onDeleteAccount,
}: OverviewPanelProps) {
  const [newForm, setNewForm] = useState<AccountInput>({
    name: "",
    currency: "GBP",
    type: "bank",
  });
  const [editForm, setEditForm] = useState<AccountInput | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function showError(err: unknown) {
    const text = err instanceof Error ? err.message : String(err);
    setFeedback({ kind: "error", text });
  }

  async function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newForm.name.trim()) return;
    try {
      await onUpsertAccount({ ...newForm, name: newForm.name.trim() });
      setNewForm({ name: "", currency: "GBP", type: "bank" });
      setFeedback({ kind: "success", text: `Account "${newForm.name.trim()}" added.` });
    } catch (err) {
      showError(err);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm?.id || !editForm.name.trim()) return;
    try {
      await onUpsertAccount({ ...editForm, name: editForm.name.trim() });
      setFeedback({ kind: "success", text: `Account "${editForm.name.trim()}" updated.` });
      setEditForm(null);
    } catch (err) {
      showError(err);
    }
  }

  return (
    <section className="stack gap-12">
      {feedback && (
        <article className={`panel ${feedback.kind === "error" ? "error" : "notice"}`}>
          <div className="section-row">
            <p>{feedback.text}</p>
            <button className="btn" type="button" onClick={() => setFeedback(null)}>
              Dismiss
            </button>
          </div>
        </article>
      )}

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
          <p className="hint">Edit, deactivate, or remove accounts used in planning.</p>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={account.isActive ? "account-row account-row-active" : "account-row account-row-inactive"}
                >
                  <td>{account.name}</td>
                  <td>{account.currency}</td>
                  <td>{account.type}</td>
                  <td>{account.isActive ? "Active" : "Inactive"}</td>
                  <td>{formatMoney(account.currentBalance ?? 0, account.currency)}</td>
                  <td>
                    <div className="actions-row compact">
                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          setEditForm({
                            id: account.id,
                            name: account.name,
                            currency: account.currency,
                            type: account.type,
                            isActive: account.isActive,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={async () => {
                          try {
                            await onUpsertAccount({
                            id: account.id,
                            name: account.name,
                            currency: account.currency,
                            type: account.type,
                            isActive: !account.isActive,
                            });
                            setFeedback({
                              kind: "success",
                              text: `Account "${account.name}" ${account.isActive ? "deactivated" : "activated"}.`,
                            });
                          } catch (err) {
                            showError(err);
                          }
                        }}
                      >
                        {account.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete account \"${account.name} (${account.currency})\"?`)) {
                            try {
                              await onDeleteAccount(account.id);
                              setFeedback({ kind: "success", text: `Account "${account.name}" deleted.` });
                            } catch (err) {
                              showError(err);
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {editForm && (
        <article className="panel">
          <div className="section-row">
            <h2>Edit Account</h2>
            <button className="btn" type="button" onClick={() => setEditForm(null)}>
              Cancel
            </button>
          </div>
          <form className="grid-form" onSubmit={submitEdit}>
            <label>
              Name
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((v) => (v ? { ...v, name: e.target.value } : v))}
                required
              />
            </label>
            <label>
              Currency
              <select
                value={editForm.currency}
                onChange={(e) =>
                  setEditForm((v) => (v ? { ...v, currency: e.target.value as AccountInput["currency"] } : v))
                }
              >
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              Type
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((v) => (v ? { ...v, type: e.target.value as AccountInput["type"] } : v))}
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
                <option value="receivable">Receivable</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={editForm.isActive === false ? "inactive" : "active"}
                onChange={(e) =>
                  setEditForm((v) => (v ? { ...v, isActive: e.target.value === "active" } : v))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button className="btn primary" type="submit">
              Save Account
            </button>
          </form>
        </article>
      )}

      <article className="panel">
        <div className="section-row">
          <h2>Add Account</h2>
          <p className="hint">Use one entry per bank/currency account.</p>
        </div>
        <form className="grid-form" onSubmit={submitNew}>
          <label>
            Name
            <input
              value={newForm.name}
              onChange={(e) => setNewForm((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Currency
            <select
              value={newForm.currency}
              onChange={(e) => setNewForm((v) => ({ ...v, currency: e.target.value as AccountInput["currency"] }))}
            >
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Type
            <select
              value={newForm.type}
              onChange={(e) => setNewForm((v) => ({ ...v, type: e.target.value as AccountInput["type"] }))}
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="receivable">Receivable</option>
            </select>
          </label>
          <button className="btn primary" type="submit">
            Add Account
          </button>
        </form>
      </article>
    </section>
  );
}
