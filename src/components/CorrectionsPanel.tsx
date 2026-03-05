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
  onDeleteCorrection: (id: string) => Promise<void>;
}

type CorrectionFormState = Omit<QuickCorrectionInput, "delta"> & {
  deltaText: string;
};

function toForm(correction: QuickCorrection): CorrectionFormState {
  return {
    id: correction.id,
    effectiveMonth: correction.effectiveMonth,
    accountId: correction.accountId,
    deltaText: String(correction.delta),
    currency: correction.currency,
    reason: correction.reason ?? "",
  };
}

export default function CorrectionsPanel({
  dashboard,
  accounts,
  onApplyCorrection,
  onDeleteCorrection,
}: CorrectionsPanelProps) {
  const defaultAccount = accounts[0];
  const [form, setForm] = useState<CorrectionFormState>({
    effectiveMonth: new Date().toISOString().slice(0, 7) + "-01",
    accountId: defaultAccount?.id ?? "",
    deltaText: "",
    currency: defaultAccount?.currency ?? "GBP",
    reason: "",
  });
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function showError(err: unknown) {
    const text = err instanceof Error ? err.message : String(err);
    setFeedback({ kind: "error", text });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.accountId) return;

    const delta = Number(form.deltaText);
    if (!Number.isFinite(delta) || delta === 0) return;

    try {
      const isEdit = Boolean(form.id);
      await onApplyCorrection({
        id: form.id,
        effectiveMonth: form.effectiveMonth,
        accountId: form.accountId,
        delta,
        currency: form.currency,
        reason: form.reason,
      });

      setForm((old) => ({
        effectiveMonth: old.effectiveMonth,
        accountId: old.accountId,
        deltaText: "",
        currency: old.currency,
        reason: "",
      }));
      setFeedback({
        kind: "success",
        text: `Correction ${isEdit ? "updated" : "saved"} for ${form.effectiveMonth.slice(0, 7)}.`,
      });
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
          <h2>{form.id ? "Edit Quick Correction" : "Add Quick Correction"}</h2>
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
              type="text"
              inputMode="decimal"
              value={form.deltaText}
              onChange={(e) => setForm((v) => ({ ...v, deltaText: e.target.value }))}
              placeholder="e.g. -120"
              required
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

          <div className="actions-row">
            <button className="btn primary" type="submit">
              {form.id ? "Save Correction" : "Apply Correction"}
            </button>
            {form.id && (
              <button
                className="btn"
                type="button"
                onClick={() =>
                  setForm({
                    effectiveMonth: new Date().toISOString().slice(0, 7) + "-01",
                    accountId: defaultAccount?.id ?? "",
                    deltaText: "",
                    currency: defaultAccount?.currency ?? "GBP",
                    reason: "",
                  })
                }
              >
                Cancel Edit
              </button>
            )}
          </div>
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
                <th>Action</th>
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
                    <td>
                      <div className="actions-row compact">
                        <button className="btn" type="button" onClick={() => setForm(toForm(correction))}>
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Delete correction for ${correction.effectiveMonth.slice(0, 7)}?`)) return;
                            try {
                              await onDeleteCorrection(correction.id);
                              setFeedback({
                                kind: "success",
                                text: `Correction deleted for ${correction.effectiveMonth.slice(0, 7)}.`,
                              });
                            } catch (err) {
                              showError(err);
                            }
                          }}
                        >
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
