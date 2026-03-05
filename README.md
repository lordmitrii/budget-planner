# Balance Planner

Desktop app for monthly balance planning.

## Stack

- Tauri v2 (Rust backend + desktop shell)
- React + TypeScript + Vite (UI)
- SQLite (local persistence)

## What it does

- Monthly close workflow (enter actual balances once a month)
- Forecast timeline (actual vs projected)
- Forecast drivers (recurring and planned events)
- Quick corrections between closes
- Local import/export and backups

## Prerequisites

- Node.js + npm
- Rust (`rustup`, `cargo`, `rustc`)
- OS-specific Tauri dependencies (WebKit2GTK on Linux, MSVC Build Tools + Windows SDK on Windows)

## Run in development

```bash
cd desktop
npm install
npm run tauri:dev
```

Frontend only:

```bash
cd desktop
npm run dev
```

## Build production app

```bash
cd desktop
npm install
npm run tauri:build
```

Generated installers/binaries are under:

- `desktop/src-tauri/target/release/bundle/`

## Optional checks

```bash
cd desktop
npm test
```

```bash
cd desktop/src-tauri
cargo test --no-default-features
```
