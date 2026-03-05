#!/usr/bin/env python3
"""Extract seed data from Balance.xlsx (Excel XML inside xlsx, no external deps)."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}
CURRENCY_MAP = {"GBP": "GBP", "EURO": "EUR", "DOLLAR": "USD"}


def parse_month_label(label: str) -> dt.date | None:
    m = re.match(r"^Early\s+([A-Za-z]{3})\s+(\d{4})$", label.strip())
    if not m:
        return None
    month = MONTHS.get(m.group(1).title())
    if not month:
        return None
    year = int(m.group(2))
    return dt.date(year, month, 1)


def parse_numeric(value: str | None) -> float:
    if value is None:
        return 0.0
    raw = value.strip()
    if raw in {"", "-"}:
        return 0.0
    raw = raw.replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return 0.0


def col_letters(cell_ref: str) -> str:
    return "".join(ch for ch in cell_ref if ch.isalpha())


def parse_sheet(xlsx_path: Path) -> tuple[list[str], list[dict]]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared = []
        sst_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in sst_root.findall("m:si", NS):
            text = "".join(node.text or "" for node in si.findall(".//m:t", NS))
            shared.append(text)

        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))

    rows: list[dict] = []
    for row in sheet.findall(".//m:sheetData/m:row", NS):
        result: dict[str, str] = {}
        for c in row.findall("m:c", NS):
            ref = c.attrib.get("r", "")
            col = col_letters(ref)
            if not col:
                continue
            v = c.find("m:v", NS)
            if v is None:
                continue
            value = v.text or ""
            if c.attrib.get("t") == "s":
                value = shared[int(value)]
            result[col] = value
        rows.append(result)

    header = next((r for r in rows if r.get("C") == "Month" and r.get("D") == "Currency"), None)
    if not header:
        raise ValueError("Could not find month/currency header row.")

    bank_columns = ["E", "F", "G", "H", "I", "J", "K"]
    banks = [header.get(col, f"Bank {col}") for col in bank_columns]

    snapshots: list[dict] = []
    current_month: str | None = None

    for row in rows:
        month_label = row.get("C", "").strip()
        if parse_month_label(month_label):
            current_month = month_label

        currency_raw = row.get("D", "").strip().upper()
        if current_month is None or currency_raw not in CURRENCY_MAP:
            continue

        month_date = parse_month_label(current_month)
        if not month_date:
            continue

        currency = CURRENCY_MAP[currency_raw]
        existing = next((s for s in snapshots if s["monthLabel"] == current_month), None)
        if existing is None:
            existing = {
                "monthLabel": current_month,
                "monthDate": month_date.isoformat(),
                "currencies": {},
                "overallBaseTotal": None,
            }
            snapshots.append(existing)

        accounts = {}
        for i, col in enumerate(bank_columns):
            accounts[banks[i]] = parse_numeric(row.get(col))

        existing["currencies"][currency] = {
            "accounts": accounts,
            "total": parse_numeric(row.get("L")),
        }

        if currency == "GBP":
            overall = parse_numeric(row.get("M"))
            if overall > 0:
                existing["overallBaseTotal"] = overall

    snapshots.sort(key=lambda s: s["monthDate"])
    return banks, snapshots


def build_seed(xlsx_path: Path) -> dict:
    banks, snapshots = parse_sheet(xlsx_path)
    today = dt.date.today()

    past_or_now = [s for s in snapshots if dt.date.fromisoformat(s["monthDate"]) <= today]
    latest = past_or_now[-1] if past_or_now else snapshots[-1]

    seen_account_keys: set[tuple[str, str]] = set()
    for snap in snapshots:
        if dt.date.fromisoformat(snap["monthDate"]) > dt.date.fromisoformat(latest["monthDate"]):
            continue
        for cur, block in snap["currencies"].items():
            for bank, bal in block["accounts"].items():
                if abs(bal) > 0:
                    seen_account_keys.add((bank, cur))

    accounts = []
    for bank in banks:
        for cur in ["GBP", "EUR", "USD"]:
            key = (bank, cur)
            if key not in seen_account_keys:
                continue
            bal = latest["currencies"].get(cur, {}).get("accounts", {}).get(bank, 0.0)
            account_type = "bank"
            if bank == "Cash":
                account_type = "cash"
            if bank == "Someone Owns Me":
                account_type = "receivable"

            accounts.append(
                {
                    "id": f"{bank.lower().replace(' ', '-')}-{cur.lower()}",
                    "name": bank,
                    "currency": cur,
                    "balance": round(bal, 2),
                    "type": account_type,
                }
            )

    history = []
    for snap in snapshots:
        totals = {
            "GBP": round(snap["currencies"].get("GBP", {}).get("total", 0.0), 2),
            "EUR": round(snap["currencies"].get("EUR", {}).get("total", 0.0), 2),
            "USD": round(snap["currencies"].get("USD", {}).get("total", 0.0), 2),
        }
        history.append(
            {
                "monthLabel": snap["monthLabel"],
                "monthDate": snap["monthDate"],
                "totals": totals,
                "overallBaseTotal": round(snap["overallBaseTotal"], 2) if snap["overallBaseTotal"] else None,
            }
        )

    return {
        "version": 1,
        "importedAt": dt.datetime.now().isoformat(timespec="seconds"),
        "sourceFile": str(xlsx_path),
        "baseCurrency": "GBP",
        "exchangeRatesToGBP": {"GBP": 1, "EUR": 0.86, "USD": 0.79},
        "selectedSnapshot": {
            "monthLabel": latest["monthLabel"],
            "monthDate": latest["monthDate"],
        },
        "accounts": accounts,
        "history": history,
        "budgets": [
            {"id": "rent", "name": "Rent", "limit": 900, "currency": "GBP"},
            {"id": "utilities", "name": "Utilities", "limit": 150, "currency": "GBP"},
            {"id": "food", "name": "Food", "limit": 300, "currency": "GBP"},
            {"id": "fun", "name": "Fun", "limit": 200, "currency": "GBP"},
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path, help="Path to Balance.xlsx")
    parser.add_argument("--json-output", type=Path, default=Path("data/balance-seed.json"))
    parser.add_argument("--js-output", type=Path, default=Path("data/seed-data.js"))
    args = parser.parse_args()

    seed = build_seed(args.xlsx)

    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.write_text(json.dumps(seed, indent=2), encoding="utf-8")

    args.js_output.parent.mkdir(parents=True, exist_ok=True)
    args.js_output.write_text(
        "window.BALANCE_SEED = " + json.dumps(seed, indent=2) + ";\n",
        encoding="utf-8",
    )

    print(f"Wrote {args.json_output}")
    print(f"Wrote {args.js_output}")
    print(f"Selected snapshot: {seed['selectedSnapshot']['monthLabel']}")


if __name__ == "__main__":
    main()
