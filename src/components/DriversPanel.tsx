import { useState } from "react";
import type { FormEvent } from "react";
import type { Account, DashboardPayload, Driver, DriverInput } from "@shared/types";
import { formatMoney } from "@/lib/money";

interface DriversPanelProps {
  dashboard: DashboardPayload;
  accounts: Account[];
  onUpsertDriver: (input: DriverInput) => Promise<unknown>;
  onDeleteDriver: (id: string) => Promise<unknown>;
}

type DriverFormState = Omit<DriverInput, "amount"> & {
  amountText: string;
};

const emptyDriver = (accountId: string, currency: DriverInput["currency"]): DriverFormState => ({
  accountId,
  kind: "recurring",
  label: "",
  amountText: "",
  currency,
  startMonth: new Date().toISOString().slice(0, 7) + "-01",
  endMonth: null,
  repeatRule: "monthly",
});

function toForm(driver: Driver): DriverFormState {
  return {
    id: driver.id,
    accountId: driver.accountId,
    kind: driver.kind,
    label: driver.label,
    amountText: String(driver.amount),
    currency: driver.currency,
    startMonth: driver.startMonth,
    endMonth: driver.endMonth,
    repeatRule: driver.repeatRule,
    isActive: driver.isActive,
  };
}

export default function DriversPanel({ dashboard, accounts, onUpsertDriver, onDeleteDriver }: DriversPanelProps) {
  const defaultAccount = accounts[0];
  const [form, setForm] = useState<DriverFormState>(
    emptyDriver(defaultAccount?.id ?? "", defaultAccount?.currency ?? "GBP"),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.label.trim() || !form.accountId) return;

    const amount = Number(form.amountText);
    if (!Number.isFinite(amount)) return;

    await onUpsertDriver({
      id: form.id,
      accountId: form.accountId,
      kind: form.kind,
      label: form.label.trim(),
      amount,
      currency: form.currency,
      startMonth: form.startMonth,
      endMonth: form.endMonth,
      repeatRule: form.repeatRule,
      isActive: form.isActive,
    });

    setForm((old) => emptyDriver(old.accountId, old.currency));
  }

  return (
    <section className="stack gap-12">
      <article className="panel">
        <div className="section-row">
          <h2>Forecast Drivers</h2>
          <p className="hint">Recurring or planned events shape your projection curve.</p>
        </div>

        <form className="grid-form" onSubmit={submit}>
          <label>
            Label
            <input value={form.label} onChange={(e) => setForm((v) => ({ ...v, label: e.target.value }))} required />
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
            Kind
            <select value={form.kind} onChange={(e) => setForm((v) => ({ ...v, kind: e.target.value as DriverInput["kind"] }))}>
              <option value="recurring">Recurring</option>
              <option value="planned_event">Planned Event</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="text"
              inputMode="decimal"
              value={form.amountText}
              onChange={(e) => setForm((v) => ({ ...v, amountText: e.target.value }))}
              placeholder="e.g. -2500"
              required
            />
          </label>
          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm((v) => ({ ...v, currency: e.target.value as DriverInput["currency"] }))}
            >
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Repeat Rule
            <select
              value={form.repeatRule}
              onChange={(e) => setForm((v) => ({ ...v, repeatRule: e.target.value as DriverInput["repeatRule"] }))}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="once">Once</option>
            </select>
          </label>
          <label>
            Start Month
            <input
              type="month"
              value={form.startMonth.slice(0, 7)}
              onChange={(e) => setForm((v) => ({ ...v, startMonth: `${e.target.value}-01` }))}
            />
          </label>
          <label>
            End Month (optional)
            <input
              type="month"
              value={form.endMonth ? form.endMonth.slice(0, 7) : ""}
              onChange={(e) => setForm((v) => ({ ...v, endMonth: e.target.value ? `${e.target.value}-01` : null }))}
            />
          </label>
          {form.id && (
            <label>
              Status
              <select
                value={form.isActive === false ? "inactive" : "active"}
                onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.value === "active" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          )}
          <div className="actions-row">
            <button className="btn primary" type="submit">
              {form.id ? "Save Driver" : "Add Driver"}
            </button>
            {form.id && (
              <button
                className="btn"
                type="button"
                onClick={() => setForm(emptyDriver(defaultAccount?.id ?? "", defaultAccount?.currency ?? "GBP"))}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Current Drivers</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Account</th>
                <th>Kind</th>
                <th>Amount</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.drivers.map((driver) => {
                const account = accounts.find((a) => a.id === driver.accountId);
                return (
                  <tr key={driver.id}>
                    <td>{driver.label}</td>
                    <td>{account ? `${account.name} (${account.currency})` : driver.accountId}</td>
                    <td>{driver.kind}</td>
                    <td>{formatMoney(driver.amount, driver.currency)}</td>
                    <td>
                      {driver.startMonth.slice(0, 7)}
                      {driver.endMonth ? ` -> ${driver.endMonth.slice(0, 7)}` : " -> open"} ({driver.repeatRule})
                    </td>
                    <td>{driver.isActive ? "Active" : "Inactive"}</td>
                    <td>
                      <div className="actions-row compact">
                        <button className="btn" type="button" onClick={() => setForm(toForm(driver))}>
                          Edit
                        </button>
                        <button className="btn danger" type="button" onClick={() => onDeleteDriver(driver.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
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
