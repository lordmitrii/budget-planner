import { useEffect, useState } from "react";
import type { FxFallbackInput, FxRefreshResult, FxSettingsPayload } from "@shared/types";

interface SettingsPanelProps {
  settings: FxSettingsPayload;
  onSaveFallbacks: (input: FxFallbackInput) => Promise<FxSettingsPayload>;
  onRefreshFx: () => Promise<FxRefreshResult>;
}

export default function SettingsPanel({ settings, onSaveFallbacks, onRefreshFx }: SettingsPanelProps) {
  const [eurFallback, setEurFallback] = useState(String(settings.fallbackEurToGbp));
  const [usdFallback, setUsdFallback] = useState(String(settings.fallbackUsdToGbp));
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"save" | "refresh" | null>(null);

  useEffect(() => {
    setEurFallback(String(settings.fallbackEurToGbp));
    setUsdFallback(String(settings.fallbackUsdToGbp));
  }, [settings.fallbackEurToGbp, settings.fallbackUsdToGbp]);

  async function saveFallbacks() {
    const eur = Number(eurFallback);
    const usd = Number(usdFallback);
    if (!Number.isFinite(eur) || eur <= 0 || !Number.isFinite(usd) || usd <= 0) {
      setFeedback({ kind: "error", text: "Fallback rates must be positive numbers." });
      return;
    }

    try {
      setBusy("save");
      await onSaveFallbacks({ fallbackEurToGbp: eur, fallbackUsdToGbp: usd });
      setFeedback({ kind: "success", text: "Fallback FX settings saved." });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setFeedback({ kind: "error", text: `Could not save fallbacks: ${text}` });
    } finally {
      setBusy(null);
    }
  }

  async function refreshFx() {
    try {
      setBusy("refresh");
      const result = await onRefreshFx();
      setFeedback({ kind: "success", text: result.message });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setFeedback({ kind: "error", text: `Could not refresh FX rates: ${text}` });
    } finally {
      setBusy(null);
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
          <h2>FX Settings</h2>
          <p className="hint">Live fetch first, fallback values if internet call fails.</p>
        </div>

        <div className="grid-form">
          <label>
            Fallback EUR -&gt; GBP
            <input
              type="number"
              step="0.0001"
              min="0"
              value={eurFallback}
              onChange={(e) => setEurFallback(e.target.value)}
            />
          </label>
          <label>
            Fallback USD -&gt; GBP
            <input
              type="number"
              step="0.0001"
              min="0"
              value={usdFallback}
              onChange={(e) => setUsdFallback(e.target.value)}
            />
          </label>
          <div className="actions-row">
            <button
              className={`btn primary ${busy === "save" ? "loading" : ""}`}
              type="button"
              onClick={saveFallbacks}
              disabled={busy !== null}
            >
              {busy === "save" ? "Saving..." : "Save Fallbacks"}
            </button>
            <button
              className={`btn secondary ${busy === "refresh" ? "loading" : ""}`}
              type="button"
              onClick={refreshFx}
              disabled={busy !== null}
            >
              {busy === "refresh" ? "Fetching..." : "Fetch Live FX"}
            </button>
          </div>
        </div>
      </article>

      <article className="panel">
        <h3>Latest Stored Rates</h3>
        <p className="hint">
          Month: {settings.latestMonth ?? "none"} | EUR-&gt;GBP: {settings.latestEurToGbp ?? "n/a"} | USD-&gt;GBP: {settings.latestUsdToGbp ?? "n/a"}
        </p>
      </article>
    </section>
  );
}
