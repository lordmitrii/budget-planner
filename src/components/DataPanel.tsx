import { useState } from "react";
import type { ImportResult, SeedImportInput, TsvImportInput } from "@shared/types";

interface DataPanelProps {
  onImportSeed: (input: SeedImportInput) => Promise<ImportResult>;
  onImportTsv: (input: TsvImportInput) => Promise<ImportResult>;
  onExportBackup: () => Promise<string>;
  onImportBackup: (json: string) => Promise<ImportResult>;
}

export default function DataPanel({ onImportSeed, onImportTsv, onExportBackup, onImportBackup }: DataPanelProps) {
  const [seedJson, setSeedJson] = useState("");
  const [tsv, setTsv] = useState("");
  const [backupJson, setBackupJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function showError(err: unknown) {
    const text = err instanceof Error ? err.message : String(err);
    setError(text);
    setMessage(null);
  }

  async function importSeed() {
    try {
      const result = await onImportSeed({ json: seedJson });
      setMessage(result.message);
      setError(null);
    } catch (err) {
      showError(err);
    }
  }

  async function importTsv() {
    try {
      const result = await onImportTsv({ tsv });
      setMessage(result.message);
      setError(null);
    } catch (err) {
      showError(err);
    }
  }

  async function exportBackup() {
    try {
      const json = await onExportBackup();
      setBackupJson(json);
      setMessage("Backup exported to textbox.");
      setError(null);
    } catch (err) {
      showError(err);
    }
  }

  async function importBackup() {
    try {
      const result = await onImportBackup(backupJson);
      setMessage(result.message);
      setError(null);
    } catch (err) {
      showError(err);
    }
  }

  return (
    <section className="stack gap-12">
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
          <button className="btn primary" type="button" onClick={importSeed}>
            Import Seed JSON
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
          <button className="btn secondary" type="button" onClick={importTsv}>
            Import TSV
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="section-row">
          <h2>Backup</h2>
          <p className="hint">Export/import full local state snapshot.</p>
        </div>
        <div className="actions-row">
          <button className="btn secondary" type="button" onClick={exportBackup}>
            Export Backup
          </button>
          <button className="btn primary" type="button" onClick={importBackup}>
            Import Backup
          </button>
        </div>
        <textarea
          rows={12}
          value={backupJson}
          onChange={(e) => setBackupJson(e.target.value)}
          placeholder="Backup JSON"
        />
      </article>

      {message && <article className="panel notice">{message}</article>}
      {error && <article className="panel error">Data action failed: {error}</article>}
    </section>
  );
}
