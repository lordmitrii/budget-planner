# Balance Planner Desktop

Desktop-first monthly balance planner built with Tauri + React + TypeScript.

## Core workflow

- Enter actual balances once per month (`Monthly Close`)
- Keep a 24-month forecast driven by recurring/planned scenario drivers
- Apply quick corrections between closes
- See actual vs projected timeline and variance
- Auto-bootstrap from repo seed file (`../data/balance-seed.json`) on first run when DB is empty

## Project structure

- `src-tauri/` Rust backend + SQLite + projection engine + Tauri commands
- `src/` React frontend screens and forms
- `shared/` shared TypeScript domain types
- `../migrations/` SQL migrations used by backend

## Required tooling

- Node.js 20+
- Rust toolchain (`rustup`, `cargo`, `rustc`)
- Tauri prerequisites for your OS (WebKit2GTK on Linux, etc.)

## Run in dev

```bash
cd desktop
npm install
npm run tauri:dev
```

## Frontend-only dev

```bash
cd desktop
npm install
npm run dev
```

## Tests

Frontend tests:

```bash
cd desktop
npm run test
```

Rust tests (when Rust installed):

```bash
cd desktop/src-tauri
cargo test
```

## Commands exposed to frontend

- `init_app`
- `get_dashboard`
- `list_accounts`
- `upsert_account`
- `set_monthly_close`
- `apply_quick_correction`
- `upsert_driver`
- `delete_driver`
- `recompute_projection`
- `import_seed_json`
- `import_excel_tsv`
- `export_backup`
- `import_backup`
