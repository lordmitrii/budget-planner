import { useState } from "react";
import type { ImportResult, SeedImportInput, TsvImportInput } from "@shared/types";

interface DataPanelProps {
  onImportSeed: (input: SeedImportInput) => Promise<ImportResult>;
  onImportTsv: (input: TsvImportInput) => Promise<ImportResult>;
  onExportBackup: () => Promise<string>;
  onImportBackup: (json: string) => Promise<ImportResult>;
}

type Feedback = {
  kind: "success" | "error";
  text: string;
};

type BusyAction = "import-seed" | "import-tsv" | "export-backup" | "import-backup" | null;

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function DataPanel({ onImportSeed, onImportTsv, onExportBackup, onImportBackup }: DataPanelProps) {
  const [seedJson, setSeedJson] = useState("");
  const [tsv, setTsv] = useState("");
  const [backupJson, setBackupJson] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  async function importSeed() {
    if (!seedJson.trim()) {
      setFeedback({ kind: "error", text: "Paste seed JSON first." });
      return;
    }
    if (!window.confirm("Import seed JSON and replace current accounts/history/projection data?")) {
      return;
    }

    try {
      setBusyAction("import-seed");
      const result = await onImportSeed({ json: seedJson });
      setFeedback({ kind: "success", text: result.message });
    } catch (err) {
      setFeedback({ kind: "error", text: `Seed import failed: ${errorText(err)}` });
    } finally {
      setBusyAction(null);
    }
  }

  async function importTsv() {
    if (!tsv.trim()) {
      setFeedback({ kind: "error", text: "Paste TSV first." });
      return;
    }
    if (!window.confirm("Import TSV and replace current accounts/history/projection data?")) {
      return;
    }

    try {
      setBusyAction("import-tsv");
      const result = await onImportTsv({ tsv });
      setFeedback({ kind: "success", text: result.message });
    } catch (err) {
      setFeedback({ kind: "error", text: `TSV import failed: ${errorText(err)}` });
    } finally {
      setBusyAction(null);
    }
  }

  async function exportBackup() {
    try {
      setBusyAction("export-backup");
      const json = await onExportBackup();
      setBackupJson(json);
      setFeedback({ kind: "success", text: "Backup exported to textbox." });
    } catch (err) {
      setFeedback({ kind: "error", text: `Backup export failed: ${errorText(err)}` });
    } finally {
      setBusyAction(null);
    }
  }

  async function importBackup() {
    if (!backupJson.trim()) {
      setFeedback({ kind: "error", text: "Paste backup JSON first." });
      return;
    }
    if (!window.confirm("Import backup and replace all current local data?")) {
      return;
    }

    try {
      setBusyAction("import-backup");
      const result = await onImportBackup(backupJson);
      setFeedback({ kind: "success", text: result.message });
    } catch (err) {
      setFeedback({ kind: "error", text: `Backup import failed: ${errorText(err)}` });
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

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
          <h2>Import Seed JSON</h2>
          <p className="hint">Use existing `data/balance-seed.json` content.</p>
        </div>
        <textarea
          rows={10}
          value={seedJson}
          onChange={(e) => setSeedJson(e.target.value)}
          placeholder="Paste seed JSON here"
        />
        <div className="actions-row">
          <button
            className={`btn primary ${busyAction === "import-seed" ? "loading" : ""}`}
            type="button"
            onClick={importSeed}
            disabled={busy}
          >
            {busyAction === "import-seed" ? "Importing..." : "Import Seed JSON"}
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="section-row">
          <h2>Import Excel TSV</h2>
          <p className="hint">Paste tab-separated rows copied from Excel.</p>
        </div>
        <textarea
          rows={8}
          value={tsv}
          onChange={(e) => setTsv(e.target.value)}
          placeholder="Month\tCurrency\tBarclays..."
        />
        <div className="actions-row">
          <button
            className={`btn secondary ${busyAction === "import-tsv" ? "loading" : ""}`}
            type="button"
            onClick={importTsv}
            disabled={busy}
          >
            {busyAction === "import-tsv" ? "Importing..." : "Import TSV"}
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="section-row">
          <h2>Backup</h2>
          <p className="hint">Export/import full local state snapshot.</p>
        </div>
        <div className="actions-row">
          <button
            className={`btn secondary ${busyAction === "export-backup" ? "loading" : ""}`}
            type="button"
            onClick={exportBackup}
            disabled={busy}
          >
            {busyAction === "export-backup" ? "Exporting..." : "Export Backup"}
          </button>
          <button
            className={`btn primary ${busyAction === "import-backup" ? "loading" : ""}`}
            type="button"
            onClick={importBackup}
            disabled={busy}
          >
            {busyAction === "import-backup" ? "Importing..." : "Import Backup"}
          </button>
        </div>
        <textarea
          rows={12}
          value={backupJson}
          onChange={(e) => setBackupJson(e.target.value)}
          placeholder="Backup JSON"
        />
      </article>
    </section>
  );
}
