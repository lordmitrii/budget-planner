PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fx_rates_monthly (
  month TEXT NOT NULL,
  currency TEXT NOT NULL,
  to_gbp REAL NOT NULL,
  PRIMARY KEY (month, currency)
);

CREATE TABLE IF NOT EXISTS monthly_actual_closes (
  month TEXT NOT NULL,
  account_id TEXT NOT NULL,
  closing_balance REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (month, account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_drivers (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  start_month TEXT NOT NULL,
  end_month TEXT,
  repeat_rule TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quick_corrections (
  id TEXT PRIMARY KEY,
  effective_month TEXT NOT NULL,
  account_id TEXT NOT NULL,
  delta REAL NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projection_snapshots (
  run_id TEXT NOT NULL,
  month TEXT NOT NULL,
  account_id TEXT NOT NULL,
  projected_balance REAL NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (run_id, month, account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_variances (
  month TEXT NOT NULL,
  account_id TEXT NOT NULL,
  projected_before REAL NOT NULL,
  actual REAL NOT NULL,
  variance REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (month, account_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monthly_actual_closes_month ON monthly_actual_closes(month);
CREATE INDEX IF NOT EXISTS idx_quick_corrections_effective_month ON quick_corrections(effective_month);
CREATE INDEX IF NOT EXISTS idx_scenario_drivers_account ON scenario_drivers(account_id);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_month ON projection_snapshots(month);
