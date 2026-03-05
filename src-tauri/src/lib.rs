use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{Datelike, NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use uuid::Uuid;

const DEFAULT_EUR_TO_GBP: f64 = 0.86;
const DEFAULT_USD_TO_GBP: f64 = 0.79;
const DEFAULT_HORIZON_MONTHS: u8 = 24;

#[derive(Default)]
pub struct AppState {
    db_path: Mutex<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name: String,
    pub currency: String,
    pub r#type: String,
    pub is_active: bool,
    pub created_at: String,
    pub current_balance: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountInput {
    pub id: Option<String>,
    pub name: String,
    pub currency: String,
    pub r#type: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyCloseInputRow {
    pub account_id: String,
    pub closing_balance: f64,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyCloseInput {
    pub month: String,
    pub closes: Vec<MonthlyCloseInputRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VariancePoint {
    pub month: String,
    pub account_id: String,
    pub projected: f64,
    pub actual: f64,
    pub variance: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyCloseResult {
    pub month: String,
    pub total_projected_before: f64,
    pub total_actual: f64,
    pub total_variance: f64,
    pub account_variances: Vec<VariancePoint>,
    pub projection_run_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Driver {
    pub id: String,
    pub account_id: String,
    pub kind: String,
    pub label: String,
    pub amount: f64,
    pub currency: String,
    pub start_month: String,
    pub end_month: Option<String>,
    pub repeat_rule: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverInput {
    pub id: Option<String>,
    pub account_id: String,
    pub kind: String,
    pub label: String,
    pub amount: f64,
    pub currency: String,
    pub start_month: String,
    pub end_month: Option<String>,
    pub repeat_rule: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuickCorrection {
    pub id: String,
    pub effective_month: String,
    pub account_id: String,
    pub delta: f64,
    pub currency: String,
    pub reason: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCorrectionInput {
    pub id: Option<String>,
    pub effective_month: String,
    pub account_id: String,
    pub delta: f64,
    pub currency: String,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionRequest {
    pub horizon_months: Option<u8>,
    pub start_month: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectedPoint {
    pub run_id: String,
    pub month: String,
    pub account_id: String,
    pub projected_balance: f64,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionResult {
    pub run_id: String,
    pub horizon_months: u8,
    pub points: Vec<ProjectedPoint>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioSummary {
    pub inflow_base: f64,
    pub outflow_base: f64,
    pub net_base: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimelinePoint {
    pub month: String,
    pub total_actual_base: Option<f64>,
    pub total_projected_base: f64,
    pub variance_base: Option<f64>,
    pub is_future: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPayload {
    pub base_currency: String,
    pub horizon_months: u8,
    pub net_worth_base: f64,
    pub last_closed_month: Option<String>,
    pub variance_last_month_base: Option<f64>,
    pub accounts: Vec<Account>,
    pub drivers: Vec<Driver>,
    pub corrections: Vec<QuickCorrection>,
    pub projection: ProjectionResult,
    pub timeline: Vec<TimelinePoint>,
    pub scenario_summary: ScenarioSummary,
    pub selected_snapshot_month: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedImportInput {
    pub json: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TsvImportInput {
    pub tsv: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported_accounts: usize,
    pub imported_history_points: usize,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitPayload {
    pub db_path: String,
    pub app_version: String,
    pub base_currency: String,
    pub selected_snapshot_month: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FxRateMonthly {
    month: String,
    currency: String,
    to_gbp: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MonthlyCloseRow {
    month: String,
    account_id: String,
    closing_balance: f64,
    note: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupPayload {
    schema_version: u32,
    exported_at: String,
    app_settings: BTreeMap<String, String>,
    accounts: Vec<Account>,
    fx_rates_monthly: Vec<FxRateMonthly>,
    monthly_actual_closes: Vec<MonthlyCloseRow>,
    drivers: Vec<Driver>,
    quick_corrections: Vec<QuickCorrection>,
    projection: ProjectionResult,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedSelectedSnapshot {
    month_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedAccount {
    id: String,
    name: String,
    currency: String,
    balance: f64,
    r#type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SeedHistoryPoint {
    #[serde(rename = "monthDate", alias = "month_date")]
    month_date: String,
    #[serde(default)]
    totals: Option<HashMap<String, f64>>,
    #[serde(rename = "overallBaseTotal", alias = "overall_base_total", default)]
    overall_base_total: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedFile {
    base_currency: String,
    #[serde(rename = "exchangeRatesToGBP", alias = "exchangeRatesToGbp")]
    exchange_rates_to_gbp: HashMap<String, f64>,
    selected_snapshot: SeedSelectedSnapshot,
    accounts: Vec<SeedAccount>,
    history: Vec<SeedHistoryPoint>,
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn today_month() -> String {
    let today = Utc::now().date_naive();
    format!("{:04}-{:02}-01", today.year(), today.month())
}

fn parse_month(month: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(month, "%Y-%m-%d").map_err(|e| format!("Invalid month {month}: {e}"))
}

fn add_months(month: &str, delta: i32) -> Result<String, String> {
    let date = parse_month(month)?;
    let mut year = date.year();
    let mut idx = date.month() as i32 - 1 + delta;
    year += idx.div_euclid(12);
    idx = idx.rem_euclid(12);
    Ok(format!("{:04}-{:02}-01", year, idx + 1))
}

fn months_diff(start: &str, current: &str) -> Result<i32, String> {
    let s = parse_month(start)?;
    let c = parse_month(current)?;
    Ok((c.year() - s.year()) * 12 + c.month() as i32 - s.month() as i32)
}

fn month_in_rule(start: &str, end: Option<&str>, current: &str, rule: &str) -> Result<bool, String> {
    let diff = months_diff(start, current)?;
    if diff < 0 {
        return Ok(false);
    }
    if let Some(end_month) = end {
        if months_diff(current, end_month)? < 0 {
            return Ok(false);
        }
    }
    Ok(match rule {
        "monthly" => true,
        "quarterly" => diff % 3 == 0,
        "yearly" => diff % 12 == 0,
        "once" => diff == 0,
        _ => false,
    })
}

fn slugify(input: &str) -> String {
    let mut out = String::new();
    for ch in input.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else if out.chars().last().is_some_and(|c| c != '-') {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

fn valid_currency(currency: &str) -> bool {
    matches!(currency, "GBP" | "EUR" | "USD")
}

fn open_conn(state: &tauri::State<AppState>) -> Result<Connection, String> {
    let db_path = state.db_path.lock().map_err(|_| "DB path lock poisoned".to_string())?.clone();
    let conn = Connection::open(db_path).map_err(|e| format!("DB open failed: {e}"))?;
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    let sql = include_str!("../../migrations/001_init.sql");
    conn.execute_batch(sql).map_err(|e| format!("Migration failed: {e}"))?;

    if get_setting(conn, "base_currency")?.is_none() {
        set_setting(conn, "base_currency", "GBP")?;
    }
    Ok(())
}

fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row("SELECT value FROM app_settings WHERE key = ?1", params![key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| e.to_string())
}

fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO app_settings(key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn get_base_currency(conn: &Connection) -> Result<String, String> {
    Ok(get_setting(conn, "base_currency")?.unwrap_or_else(|| "GBP".to_string()))
}

fn get_fx_to_gbp(conn: &Connection, month: &str, currency: &str) -> Result<f64, String> {
    if currency == "GBP" {
        return Ok(1.0);
    }

    let value = conn
        .query_row(
            "SELECT to_gbp FROM fx_rates_monthly WHERE currency = ?1 AND month <= ?2 ORDER BY month DESC LIMIT 1",
            params![currency, month],
            |row| row.get::<_, f64>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(match value {
        Some(rate) if rate > 0.0 => rate,
        _ => match currency {
            "EUR" => DEFAULT_EUR_TO_GBP,
            "USD" => DEFAULT_USD_TO_GBP,
            _ => 1.0,
        },
    })
}

fn convert_currency(conn: &Connection, month: &str, amount: f64, from: &str, to: &str) -> Result<f64, String> {
    if from == to {
        return Ok(amount);
    }
    let from_rate = get_fx_to_gbp(conn, month, from)?;
    let to_rate = get_fx_to_gbp(conn, month, to)?;
    Ok((amount * from_rate) / to_rate)
}

fn list_drivers(conn: &Connection) -> Result<Vec<Driver>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, account_id, kind, label, amount, currency, start_month, end_month, repeat_rule, is_active
             FROM scenario_drivers ORDER BY label ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Driver {
                id: row.get(0)?,
                account_id: row.get(1)?,
                kind: row.get(2)?,
                label: row.get(3)?,
                amount: row.get(4)?,
                currency: row.get(5)?,
                start_month: row.get(6)?,
                end_month: row.get(7)?,
                repeat_rule: row.get(8)?,
                is_active: row.get::<_, i64>(9)? == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut drivers = Vec::new();
    for item in rows {
        drivers.push(item.map_err(|e| e.to_string())?);
    }
    Ok(drivers)
}

fn list_corrections(conn: &Connection) -> Result<Vec<QuickCorrection>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, effective_month, account_id, delta, currency, reason, created_at
             FROM quick_corrections ORDER BY effective_month DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(QuickCorrection {
                id: row.get(0)?,
                effective_month: row.get(1)?,
                account_id: row.get(2)?,
                delta: row.get(3)?,
                currency: row.get(4)?,
                reason: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut corrections = Vec::new();
    for item in rows {
        corrections.push(item.map_err(|e| e.to_string())?);
    }
    Ok(corrections)
}

fn account_latest_balance(conn: &Connection, account_id: &str) -> Result<Option<f64>, String> {
    conn.query_row(
        "SELECT closing_balance FROM monthly_actual_closes WHERE account_id = ?1 ORDER BY month DESC LIMIT 1",
        params![account_id],
        |row| row.get::<_, f64>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn list_accounts_internal(conn: &Connection) -> Result<Vec<Account>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, currency, type, is_active, created_at FROM accounts ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                currency: row.get(2)?,
                r#type: row.get(3)?,
                is_active: row.get::<_, i64>(4)? == 1,
                created_at: row.get(5)?,
                current_balance: None,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        let mut account = row.map_err(|e| e.to_string())?;
        account.current_balance = account_latest_balance(conn, &account.id)?;
        items.push(account);
    }

    Ok(items)
}

fn month_range(start: &str, horizon_months: u8) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    for i in 0..horizon_months {
        out.push(add_months(start, i as i32)?);
    }
    Ok(out)
}

fn choose_start_month(conn: &Connection, start_override: Option<String>) -> Result<String, String> {
    if let Some(value) = start_override {
        return Ok(value);
    }

    let last_close = conn
        .query_row("SELECT month FROM monthly_actual_closes ORDER BY month DESC LIMIT 1", [], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(month) = last_close {
        return Ok(month);
    }

    if let Some(snapshot) = get_setting(conn, "selected_snapshot_month")? {
        return Ok(snapshot);
    }

    Ok(today_month())
}

fn recompute_projection_internal(
    conn: &Connection,
    horizon_months: u8,
    start_override: Option<String>,
    persist: bool,
) -> Result<ProjectionResult, String> {
    let horizon = if horizon_months == 0 { DEFAULT_HORIZON_MONTHS } else { horizon_months };
    let start = choose_start_month(conn, start_override)?;
    let months = month_range(&start, horizon)?;

    let accounts = list_accounts_internal(conn)?
        .into_iter()
        .filter(|a| a.is_active)
        .collect::<Vec<_>>();

    let mut closes_map: HashMap<(String, String), f64> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT month, account_id, closing_balance FROM monthly_actual_closes")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        for item in rows {
            let (month, account_id, balance) = item.map_err(|e| e.to_string())?;
            closes_map.insert((month, account_id), balance);
        }
    }

    let corrections = list_corrections(conn)?;
    let drivers = list_drivers(conn)?;

    let mut baseline: HashMap<String, f64> = HashMap::new();
    for account in &accounts {
        let current = conn
            .query_row(
                "SELECT closing_balance FROM monthly_actual_closes WHERE account_id = ?1 AND month <= ?2 ORDER BY month DESC LIMIT 1",
                params![account.id, start],
                |row| row.get::<_, f64>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .unwrap_or(0.0);
        baseline.insert(account.id.clone(), current);
    }

    let run_id = Uuid::new_v4().to_string();
    let mut points = Vec::new();

    for (idx, month) in months.iter().enumerate() {
        for account in &accounts {
            let mut source = if idx == 0 { "baseline".to_string() } else { "driver".to_string() };

            let value = if let Some(actual) = closes_map.get(&(month.clone(), account.id.clone())) {
                source = if idx == 0 { "baseline".to_string() } else { "rebased".to_string() };
                *actual
            } else {
                let mut balance = *baseline.get(&account.id).unwrap_or(&0.0);

                for driver in &drivers {
                    if !driver.is_active || driver.account_id != account.id {
                        continue;
                    }
                    let active = month_in_rule(
                        &driver.start_month,
                        driver.end_month.as_deref(),
                        month,
                        &driver.repeat_rule,
                    )?;
                    if !active {
                        continue;
                    }
                    let converted = convert_currency(conn, month, driver.amount, &driver.currency, &account.currency)?;
                    balance += converted;
                }

                for correction in &corrections {
                    if correction.account_id == account.id && correction.effective_month == *month {
                        let converted = convert_currency(
                            conn,
                            month,
                            correction.delta,
                            &correction.currency,
                            &account.currency,
                        )?;
                        balance += converted;
                    }
                }

                balance
            };

            baseline.insert(account.id.clone(), value);
            points.push(ProjectedPoint {
                run_id: run_id.clone(),
                month: month.clone(),
                account_id: account.id.clone(),
                projected_balance: value,
                source,
            });
        }
    }

    if persist {
        conn.execute("DELETE FROM projection_snapshots", []).map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "INSERT INTO projection_snapshots(run_id, month, account_id, projected_balance, source)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
            )
            .map_err(|e| e.to_string())?;

        for point in &points {
            stmt.execute(params![
                point.run_id,
                point.month,
                point.account_id,
                point.projected_balance,
                point.source
            ])
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(ProjectionResult {
        run_id,
        horizon_months: horizon,
        points,
    })
}

fn latest_variance_sum(conn: &Connection) -> Result<Option<(String, f64)>, String> {
    let month = conn
        .query_row("SELECT month FROM monthly_variances ORDER BY month DESC LIMIT 1", [], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(|e| e.to_string())?;

    let Some(month_value) = month else {
        return Ok(None);
    };

    let sum = conn
        .query_row(
            "SELECT COALESCE(SUM(variance), 0) FROM monthly_variances WHERE month = ?1",
            params![month_value.clone()],
            |row| row.get::<_, f64>(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(Some((month_value, sum)))
}

fn load_seed_history_actual_map(conn: &Connection, base_currency: &str) -> Result<BTreeMap<String, f64>, String> {
    let Some(raw) = get_setting(conn, "seed_history_json")? else {
        return Ok(BTreeMap::new());
    };

    if raw.trim().is_empty() {
        return Ok(BTreeMap::new());
    }

    let history: Vec<SeedHistoryPoint> =
        serde_json::from_str(&raw).map_err(|e| format!("Corrupt seed history json in app_settings: {e}"))?;
    let cutoff = get_setting(conn, "selected_snapshot_month")?.unwrap_or_else(today_month);

    let mut out = BTreeMap::new();
    for point in history {
        if point.month_date.is_empty() || point.month_date > cutoff {
            continue;
        }

        let total_gbp = if let Some(v) = point.overall_base_total {
            v
        } else if let Some(totals) = &point.totals {
            let mut sum = 0.0;
            for (currency, amount) in totals {
                let cur = currency.to_uppercase();
                if !valid_currency(&cur) {
                    continue;
                }
                sum += convert_currency(conn, &point.month_date, *amount, &cur, "GBP")?;
            }
            sum
        } else {
            continue;
        };

        let total_base = convert_currency(conn, &point.month_date, total_gbp, "GBP", base_currency)?;
        out.insert(point.month_date.clone(), total_base);
    }

    Ok(out)
}

fn build_timeline(conn: &Connection, projection: &ProjectionResult, base_currency: &str) -> Result<Vec<TimelinePoint>, String> {
    let today = today_month();
    let mut month_projection_map: BTreeMap<String, Vec<&ProjectedPoint>> = BTreeMap::new();
    let seed_history_actual = load_seed_history_actual_map(conn, base_currency)?;

    for point in &projection.points {
        month_projection_map.entry(point.month.clone()).or_default().push(point);
    }

    let mut timeline = Vec::new();

    for (month, items) in month_projection_map {
        let mut projected_base_total = 0.0;
        for item in items {
            let account_currency = conn
                .query_row(
                    "SELECT currency FROM accounts WHERE id = ?1",
                    params![item.account_id.clone()],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|e| e.to_string())?
                .unwrap_or_else(|| "GBP".to_string());

            projected_base_total += convert_currency(
                conn,
                &month,
                item.projected_balance,
                &account_currency,
                base_currency,
            )?;
        }

        let actual_total = conn
            .query_row(
                "SELECT SUM(c.closing_balance * fx.to_gbp) FROM monthly_actual_closes c
                 JOIN accounts a ON a.id = c.account_id
                 JOIN (SELECT ?1 AS month, 'GBP' AS currency, 1.0 AS to_gbp
                       UNION ALL SELECT ?1, 'EUR', ?2
                       UNION ALL SELECT ?1, 'USD', ?3) fx ON fx.currency = a.currency
                 WHERE c.month = ?1",
                params![
                    month,
                    get_fx_to_gbp(conn, &month, "EUR")?,
                    get_fx_to_gbp(conn, &month, "USD")?
                ],
                |row| row.get::<_, Option<f64>>(0),
            )
            .map_err(|e| e.to_string())?;

        let mut actual_in_base = if let Some(total_gbp) = actual_total {
            Some(convert_currency(conn, &month, total_gbp, "GBP", base_currency)?)
        } else {
            None
        };
        if actual_in_base.is_none() {
            actual_in_base = seed_history_actual.get(&month).copied();
        }

        let variance = conn
            .query_row(
                "SELECT SUM(variance) FROM monthly_variances WHERE month = ?1",
                params![month.clone()],
                |row| row.get::<_, Option<f64>>(0),
            )
            .map_err(|e| e.to_string())?;

        let variance_in_base = variance
            .map(|v| convert_currency(conn, &month, v, "GBP", base_currency))
            .transpose()?;

        timeline.push(TimelinePoint {
            month: month.clone(),
            total_actual_base: actual_in_base,
            total_projected_base: projected_base_total,
            variance_base: variance_in_base,
            is_future: month > today,
        });
    }

    let first_projection_month = timeline.first().map(|p| p.month.clone());
    for (month, actual_total_base) in seed_history_actual {
        if let Some(first) = &first_projection_month {
            if month >= *first {
                continue;
            }
        }
        timeline.push(TimelinePoint {
            month: month.clone(),
            total_actual_base: Some(actual_total_base),
            total_projected_base: actual_total_base,
            variance_base: None,
            is_future: month > today,
        });
    }

    timeline.sort_by(|a, b| a.month.cmp(&b.month));

    Ok(timeline)
}

#[tauri::command]
fn init_app(state: tauri::State<AppState>) -> Result<InitPayload, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    Ok(InitPayload {
        db_path: state.db_path.lock().map_err(|_| "DB path lock poisoned".to_string())?.clone(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        base_currency: get_base_currency(&conn)?,
        selected_snapshot_month: get_setting(&conn, "selected_snapshot_month")?,
    })
}

#[tauri::command]
fn list_accounts(state: tauri::State<AppState>) -> Result<Vec<Account>, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;
    list_accounts_internal(&conn)
}

#[tauri::command]
fn upsert_account(state: tauri::State<AppState>, input: AccountInput) -> Result<Account, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    if !valid_currency(&input.currency) {
        return Err("Account currency must be GBP, EUR or USD".to_string());
    }

    let account_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    conn.execute(
        "INSERT INTO accounts(id, name, currency, type, is_active, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           currency = excluded.currency,
           type = excluded.type,
           is_active = excluded.is_active",
        params![
            account_id,
            input.name,
            input.currency,
            input.r#type,
            if input.is_active.unwrap_or(true) { 1 } else { 0 },
            now_iso()
        ],
    )
    .map_err(|e| e.to_string())?;

    recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    let account = list_accounts_internal(&conn)?
        .into_iter()
        .find(|a| a.id == account_id)
        .ok_or_else(|| "Failed to fetch upserted account".to_string())?;

    Ok(account)
}

#[tauri::command]
fn upsert_driver(state: tauri::State<AppState>, input: DriverInput) -> Result<Driver, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let driver_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO scenario_drivers(id, account_id, kind, label, amount, currency, start_month, end_month, repeat_rule, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
           account_id = excluded.account_id,
           kind = excluded.kind,
           label = excluded.label,
           amount = excluded.amount,
           currency = excluded.currency,
           start_month = excluded.start_month,
           end_month = excluded.end_month,
           repeat_rule = excluded.repeat_rule,
           is_active = excluded.is_active",
        params![
            driver_id,
            input.account_id,
            input.kind,
            input.label,
            input.amount,
            input.currency,
            input.start_month,
            input.end_month,
            input.repeat_rule,
            if input.is_active.unwrap_or(true) { 1 } else { 0 }
        ],
    )
    .map_err(|e| e.to_string())?;

    recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    let driver = list_drivers(&conn)?
        .into_iter()
        .find(|d| d.id == driver_id)
        .ok_or_else(|| "Failed to fetch upserted driver".to_string())?;

    Ok(driver)
}

#[tauri::command]
fn delete_driver(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    conn.execute("DELETE FROM scenario_drivers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;
    Ok(())
}

#[tauri::command]
fn apply_quick_correction(state: tauri::State<AppState>, input: QuickCorrectionInput) -> Result<QuickCorrection, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let correction_id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let created_at = now_iso();

    conn.execute(
        "INSERT INTO quick_corrections(id, effective_month, account_id, delta, currency, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
           effective_month = excluded.effective_month,
           account_id = excluded.account_id,
           delta = excluded.delta,
           currency = excluded.currency,
           reason = excluded.reason",
        params![
            correction_id,
            input.effective_month,
            input.account_id,
            input.delta,
            input.currency,
            input.reason,
            created_at
        ],
    )
    .map_err(|e| e.to_string())?;

    recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    let correction = list_corrections(&conn)?
        .into_iter()
        .find(|c| c.id == correction_id)
        .ok_or_else(|| "Failed to fetch upserted correction".to_string())?;

    Ok(correction)
}

#[tauri::command]
fn recompute_projection(state: tauri::State<AppState>, input: ProjectionRequest) -> Result<ProjectionResult, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    recompute_projection_internal(
        &conn,
        input.horizon_months.unwrap_or(DEFAULT_HORIZON_MONTHS),
        input.start_month,
        true,
    )
}

#[tauri::command]
fn set_monthly_close(state: tauri::State<AppState>, input: MonthlyCloseInput) -> Result<MonthlyCloseResult, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let base_currency = get_base_currency(&conn)?;

    let preview = recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, false)?;
    let projected_map: HashMap<String, f64> = preview
        .points
        .iter()
        .filter(|p| p.month == input.month)
        .map(|p| (p.account_id.clone(), p.projected_balance))
        .collect();

    let account_currency: HashMap<String, String> = list_accounts_internal(&conn)?
        .into_iter()
        .map(|a| (a.id, a.currency))
        .collect();

    let created_at = now_iso();

    for row in &input.closes {
        conn.execute(
            "INSERT INTO monthly_actual_closes(month, account_id, closing_balance, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(month, account_id) DO UPDATE SET
               closing_balance = excluded.closing_balance,
               note = excluded.note",
            params![
                input.month,
                row.account_id,
                row.closing_balance,
                row.note,
                created_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut total_projected_before = 0.0;
    let mut total_actual = 0.0;
    let mut variances = Vec::new();

    for row in &input.closes {
        let currency = account_currency
            .get(&row.account_id)
            .cloned()
            .unwrap_or_else(|| "GBP".to_string());

        let projected = *projected_map.get(&row.account_id).unwrap_or(&0.0);
        let actual = row.closing_balance;
        let variance = actual - projected;

        total_projected_before += convert_currency(&conn, &input.month, projected, &currency, &base_currency)?;
        total_actual += convert_currency(&conn, &input.month, actual, &currency, &base_currency)?;

        variances.push(VariancePoint {
            month: input.month.clone(),
            account_id: row.account_id.clone(),
            projected,
            actual,
            variance,
        });

        let variance_base = convert_currency(&conn, &input.month, variance, &currency, "GBP")?;
        tx_execute(
            &conn,
            "INSERT INTO monthly_variances(month, account_id, projected_before, actual, variance, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(month, account_id) DO UPDATE SET
               projected_before = excluded.projected_before,
               actual = excluded.actual,
               variance = excluded.variance,
               created_at = excluded.created_at",
            params![input.month, row.account_id, projected, actual, variance_base, now_iso()],
        )?;
    }

    let projection = recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    Ok(MonthlyCloseResult {
        month: input.month,
        total_projected_before,
        total_actual,
        total_variance: total_actual - total_projected_before,
        account_variances: variances,
        projection_run_id: projection.run_id,
    })
}

fn tx_execute(conn: &Connection, sql: &str, params: impl rusqlite::Params) -> Result<(), String> {
    conn.execute(sql, params).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_dashboard(state: tauri::State<AppState>, horizon_months: u8) -> Result<DashboardPayload, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let base_currency = get_base_currency(&conn)?;
    let projection = recompute_projection_internal(&conn, horizon_months, None, true)?;

    let accounts = list_accounts_internal(&conn)?;
    let drivers = list_drivers(&conn)?;
    let corrections = list_corrections(&conn)?;
    let timeline = build_timeline(&conn, &projection, &base_currency)?;

    let current_month = today_month();
    let net_worth_base = timeline
        .iter()
        .filter(|point| point.month <= current_month)
        .last()
        .map(|p| p.total_actual_base.unwrap_or(p.total_projected_base))
        .unwrap_or(0.0);

    let variance_last = latest_variance_sum(&conn)?;

    let mut inflow = 0.0;
    let mut outflow = 0.0;
    for driver in &drivers {
        if !driver.is_active {
            continue;
        }
        let active = month_in_rule(
            &driver.start_month,
            driver.end_month.as_deref(),
            &current_month,
            &driver.repeat_rule,
        )?;
        if !active {
            continue;
        }
        let base_amount = convert_currency(&conn, &current_month, driver.amount, &driver.currency, &base_currency)?;
        if base_amount >= 0.0 {
            inflow += base_amount;
        } else {
            outflow += base_amount.abs();
        }
    }

    Ok(DashboardPayload {
        base_currency,
        horizon_months: projection.horizon_months,
        net_worth_base,
        last_closed_month: conn
            .query_row("SELECT month FROM monthly_actual_closes ORDER BY month DESC LIMIT 1", [], |row| {
                row.get::<_, String>(0)
            })
            .optional()
            .map_err(|e| e.to_string())?,
        variance_last_month_base: variance_last.as_ref().map(|(_, value)| *value),
        accounts,
        drivers,
        corrections,
        projection,
        timeline,
        scenario_summary: ScenarioSummary {
            inflow_base: inflow,
            outflow_base: outflow,
            net_base: inflow - outflow,
        },
        selected_snapshot_month: get_setting(&conn, "selected_snapshot_month")?,
    })
}

fn clear_core_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "DELETE FROM projection_snapshots;
         DELETE FROM monthly_variances;
         DELETE FROM quick_corrections;
         DELETE FROM scenario_drivers;
         DELETE FROM monthly_actual_closes;
         DELETE FROM fx_rates_monthly;
         DELETE FROM accounts;",
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn import_seed_struct(conn: &Connection, seed: &SeedFile) -> Result<ImportResult, String> {
    if seed.accounts.is_empty() {
        return Err("Seed file has no accounts".to_string());
    }

    clear_core_tables(conn)?;

    for account in &seed.accounts {
        conn.execute(
            "INSERT INTO accounts(id, name, currency, type, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5)",
            params![account.id, account.name, account.currency, account.r#type, now_iso()],
        )
        .map_err(|e| e.to_string())?;
    }

    let month = seed.selected_snapshot.month_date.clone();
    for (currency, rate) in &seed.exchange_rates_to_gbp {
        if valid_currency(currency) {
            conn.execute(
                "INSERT INTO fx_rates_monthly(month, currency, to_gbp) VALUES (?1, ?2, ?3)
                 ON CONFLICT(month, currency) DO UPDATE SET to_gbp = excluded.to_gbp",
                params![month, currency, rate],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for account in &seed.accounts {
        conn.execute(
            "INSERT INTO monthly_actual_closes(month, account_id, closing_balance, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![month, account.id, account.balance, Some("Imported from seed"), now_iso()],
        )
        .map_err(|e| e.to_string())?;
    }

    set_setting(conn, "base_currency", &seed.base_currency)?;
    set_setting(conn, "selected_snapshot_month", &seed.selected_snapshot.month_date)?;
    let history_json =
        serde_json::to_string(&seed.history).map_err(|e| format!("Could not serialize seed history: {e}"))?;
    set_setting(conn, "seed_history_json", &history_json)?;

    recompute_projection_internal(conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    Ok(ImportResult {
        imported_accounts: seed.accounts.len(),
        imported_history_points: seed.history.len(),
        message: format!(
            "Imported {} accounts with baseline at {}",
            seed.accounts.len(),
            seed.selected_snapshot.month_date
        ),
    })
}

fn try_bootstrap_repo_seed(conn: &Connection) -> Result<(), String> {
    let account_count = conn
        .query_row("SELECT COUNT(*) FROM accounts", [], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    if account_count > 0 {
        return Ok(());
    }

    let candidates = [
        PathBuf::from("../data/balance-seed.json"),
        PathBuf::from("../../data/balance-seed.json"),
        PathBuf::from("data/balance-seed.json"),
    ];

    for path in candidates {
        if !path.exists() {
            continue;
        }
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed reading seed file {}: {e}", path.display()))?;
        let seed: SeedFile = serde_json::from_str(&content)
            .map_err(|e| format!("Failed parsing seed file {}: {e}", path.display()))?;
        let _ = import_seed_struct(conn, &seed)?;
        break;
    }
    Ok(())
}

#[tauri::command]
fn import_seed_json(state: tauri::State<AppState>, input: SeedImportInput) -> Result<ImportResult, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let seed: SeedFile = serde_json::from_str(&input.json).map_err(|e| format!("Invalid seed json: {e}"))?;
    import_seed_struct(&conn, &seed)
}

#[derive(Default)]
struct TsvMonthBucket {
    accounts_by_currency: HashMap<String, HashMap<String, f64>>,
}

fn parse_month_label(label: &str) -> Option<String> {
    let label = label.trim();
    let parts = label.split_whitespace().collect::<Vec<_>>();
    if parts.len() != 3 || !parts[0].eq_ignore_ascii_case("Early") {
        return None;
    }

    let month = match parts[1].to_lowercase().as_str() {
        "jan" => "01",
        "feb" => "02",
        "mar" => "03",
        "apr" => "04",
        "may" => "05",
        "jun" => "06",
        "jul" => "07",
        "aug" => "08",
        "sep" => "09",
        "oct" => "10",
        "nov" => "11",
        "dec" => "12",
        _ => return None,
    };

    Some(format!("{}-{}-01", parts[2], month))
}

#[tauri::command]
fn import_excel_tsv(state: tauri::State<AppState>, input: TsvImportInput) -> Result<ImportResult, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let lines = input
        .tsv
        .lines()
        .map(|line| line.trim_end())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();

    if lines.len() < 2 {
        return Err("TSV requires header + data rows".to_string());
    }

    let headers = lines[0].split('\t').map(|s| s.trim().to_string()).collect::<Vec<_>>();
    let lower = headers.iter().map(|h| h.to_lowercase()).collect::<Vec<_>>();

    let month_idx = lower
        .iter()
        .position(|h| h == "month")
        .ok_or_else(|| "TSV must include Month column".to_string())?;
    let currency_idx = lower
        .iter()
        .position(|h| h == "currency")
        .ok_or_else(|| "TSV must include Currency column".to_string())?;

    let bank_cols = headers
        .iter()
        .enumerate()
        .filter(|(idx, _)| *idx != month_idx && *idx != currency_idx && lower[*idx] != "total")
        .map(|(idx, name)| (idx, name.clone()))
        .collect::<Vec<_>>();

    let mut buckets: BTreeMap<String, TsvMonthBucket> = BTreeMap::new();
    let mut current_month: Option<String> = None;

    for line in &lines[1..] {
        let cols = line.split('\t').map(|s| s.trim()).collect::<Vec<_>>();

        if let Some(month) = cols.get(month_idx).and_then(|value| parse_month_label(value)) {
            current_month = Some(month);
        }

        let Some(month) = current_month.clone() else {
            continue;
        };

        let raw_currency = cols.get(currency_idx).unwrap_or(&"").to_uppercase();
        let currency = match raw_currency.as_str() {
            "GBP" => "GBP",
            "EURO" | "EUR" => "EUR",
            "DOLLAR" | "USD" => "USD",
            _ => continue,
        };

        let bucket = buckets.entry(month.clone()).or_insert_with(|| TsvMonthBucket {
            accounts_by_currency: HashMap::new(),
        });

        let mut account_map = HashMap::new();
        for (idx, name) in &bank_cols {
            let raw = cols.get(*idx).copied().unwrap_or("0").replace(',', "");
            let value = if raw == "-" || raw.is_empty() {
                0.0
            } else {
                raw.parse::<f64>().unwrap_or(0.0)
            };
            account_map.insert(name.clone(), value);
        }
        bucket.accounts_by_currency.insert(currency.to_string(), account_map);
    }

    if buckets.is_empty() {
        return Err("No month/currency data parsed from TSV".to_string());
    }

    let today = today_month();
    let mut months = buckets.keys().cloned().collect::<Vec<_>>();
    months.sort();
    let selected_month = months
        .iter()
        .filter(|month| **month <= today)
        .last()
        .cloned()
        .unwrap_or_else(|| months.last().cloned().unwrap_or_else(today_month));

    let selected_bucket = buckets
        .get(&selected_month)
        .ok_or_else(|| "Could not select snapshot month from TSV".to_string())?;

    let mut accounts_to_insert = Vec::new();
    for (currency, account_map) in &selected_bucket.accounts_by_currency {
        for (name, balance) in account_map {
            if *balance == 0.0 {
                continue;
            }
            let r#type = if name.eq_ignore_ascii_case("cash") {
                "cash"
            } else if name.eq_ignore_ascii_case("someone owns me") {
                "receivable"
            } else {
                "bank"
            };
            let account_id = format!("{}-{}", slugify(name), currency.to_lowercase());
            accounts_to_insert.push((account_id, name.clone(), currency.clone(), r#type.to_string(), *balance));
        }
    }

    clear_core_tables(&conn)?;

    for (account_id, name, currency, r#type, balance) in &accounts_to_insert {
        conn.execute(
            "INSERT INTO accounts(id, name, currency, type, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5)",
            params![account_id, name, currency, r#type, now_iso()],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO monthly_actual_closes(month, account_id, closing_balance, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![selected_month, account_id, balance, Some("Imported from TSV"), now_iso()],
        )
        .map_err(|e| e.to_string())?;
    }

    set_setting(&conn, "selected_snapshot_month", &selected_month)?;
    set_setting(&conn, "base_currency", "GBP")?;
    set_setting(&conn, "seed_history_json", "[]")?;

    conn.execute(
        "INSERT INTO fx_rates_monthly(month, currency, to_gbp) VALUES (?1, 'EUR', ?2)
         ON CONFLICT(month, currency) DO UPDATE SET to_gbp = excluded.to_gbp",
        params![selected_month, DEFAULT_EUR_TO_GBP],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO fx_rates_monthly(month, currency, to_gbp) VALUES (?1, 'USD', ?2)
         ON CONFLICT(month, currency) DO UPDATE SET to_gbp = excluded.to_gbp",
        params![selected_month, DEFAULT_USD_TO_GBP],
    )
    .map_err(|e| e.to_string())?;

    recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    Ok(ImportResult {
        imported_accounts: accounts_to_insert.len(),
        imported_history_points: buckets.len(),
        message: format!("Imported TSV snapshot {} with {} accounts", selected_month, accounts_to_insert.len()),
    })
}

#[tauri::command]
fn export_backup(state: tauri::State<AppState>) -> Result<String, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let projection = recompute_projection_internal(&conn, DEFAULT_HORIZON_MONTHS, None, true)?;

    let mut settings_stmt = conn
        .prepare("SELECT key, value FROM app_settings ORDER BY key ASC")
        .map_err(|e| e.to_string())?;
    let settings_rows = settings_stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut app_settings = BTreeMap::new();
    for item in settings_rows {
        let (key, value) = item.map_err(|e| e.to_string())?;
        app_settings.insert(key, value);
    }

    let mut fx_stmt = conn
        .prepare("SELECT month, currency, to_gbp FROM fx_rates_monthly ORDER BY month ASC")
        .map_err(|e| e.to_string())?;
    let fx_rows = fx_stmt
        .query_map([], |row| {
            Ok(FxRateMonthly {
                month: row.get(0)?,
                currency: row.get(1)?,
                to_gbp: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut fx_rates_monthly = Vec::new();
    for item in fx_rows {
        fx_rates_monthly.push(item.map_err(|e| e.to_string())?);
    }

    let mut close_stmt = conn
        .prepare("SELECT month, account_id, closing_balance, note, created_at FROM monthly_actual_closes ORDER BY month ASC")
        .map_err(|e| e.to_string())?;
    let close_rows = close_stmt
        .query_map([], |row| {
            Ok(MonthlyCloseRow {
                month: row.get(0)?,
                account_id: row.get(1)?,
                closing_balance: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut monthly_actual_closes = Vec::new();
    for item in close_rows {
        monthly_actual_closes.push(item.map_err(|e| e.to_string())?);
    }

    let backup = BackupPayload {
        schema_version: 1,
        exported_at: now_iso(),
        app_settings,
        accounts: list_accounts_internal(&conn)?,
        fx_rates_monthly,
        monthly_actual_closes,
        drivers: list_drivers(&conn)?,
        quick_corrections: list_corrections(&conn)?,
        projection,
    };

    serde_json::to_string_pretty(&backup).map_err(|e| format!("Backup serialization failed: {e}"))
}

#[tauri::command]
fn import_backup(state: tauri::State<AppState>, json: String) -> Result<ImportResult, String> {
    let conn = open_conn(&state)?;
    migrate(&conn)?;

    let backup: BackupPayload = serde_json::from_str(&json).map_err(|e| format!("Invalid backup JSON: {e}"))?;

    clear_core_tables(&conn)?;
    conn.execute("DELETE FROM app_settings", []).map_err(|e| e.to_string())?;

    for (key, value) in &backup.app_settings {
        conn.execute(
            "INSERT INTO app_settings(key, value) VALUES (?1, ?2)",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
    }

    for account in &backup.accounts {
        conn.execute(
            "INSERT INTO accounts(id, name, currency, type, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                account.id,
                account.name,
                account.currency,
                account.r#type,
                if account.is_active { 1 } else { 0 },
                account.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for fx in &backup.fx_rates_monthly {
        conn.execute(
            "INSERT INTO fx_rates_monthly(month, currency, to_gbp) VALUES (?1, ?2, ?3)",
            params![fx.month, fx.currency, fx.to_gbp],
        )
        .map_err(|e| e.to_string())?;
    }

    for close in &backup.monthly_actual_closes {
        conn.execute(
            "INSERT INTO monthly_actual_closes(month, account_id, closing_balance, note, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                close.month,
                close.account_id,
                close.closing_balance,
                close.note,
                close.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for driver in &backup.drivers {
        conn.execute(
            "INSERT INTO scenario_drivers(id, account_id, kind, label, amount, currency, start_month, end_month, repeat_rule, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                driver.id,
                driver.account_id,
                driver.kind,
                driver.label,
                driver.amount,
                driver.currency,
                driver.start_month,
                driver.end_month,
                driver.repeat_rule,
                if driver.is_active { 1 } else { 0 },
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for correction in &backup.quick_corrections {
        conn.execute(
            "INSERT INTO quick_corrections(id, effective_month, account_id, delta, currency, reason, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                correction.id,
                correction.effective_month,
                correction.account_id,
                correction.delta,
                correction.currency,
                correction.reason,
                correction.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    recompute_projection_internal(&conn, backup.projection.horizon_months, None, true)?;

    Ok(ImportResult {
        imported_accounts: backup.accounts.len(),
        imported_history_points: backup.monthly_actual_closes.len(),
        message: format!(
            "Imported backup with {} accounts and {} closes",
            backup.accounts.len(),
            backup.monthly_actual_closes.len()
        ),
    })
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut app_data_dir: PathBuf = app.path().app_data_dir()?;

            if app_data_dir.as_os_str().is_empty() {
                app_data_dir = std::env::current_dir()?;
            }

            fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("planner.db");

            let state = AppState {
                db_path: Mutex::new(db_path.to_string_lossy().to_string()),
            };

            let conn = Connection::open(db_path)?;
            migrate(&conn).map_err(std::io::Error::other)?;
            try_bootstrap_repo_seed(&conn).map_err(std::io::Error::other)?;

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_app,
            get_dashboard,
            list_accounts,
            upsert_account,
            set_monthly_close,
            apply_quick_correction,
            upsert_driver,
            delete_driver,
            recompute_projection,
            import_seed_json,
            import_excel_tsv,
            export_backup,
            import_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{add_months, month_in_rule, months_diff};

    #[test]
    fn month_math_works() {
        assert_eq!(add_months("2026-01-01", 1).unwrap(), "2026-02-01");
        assert_eq!(add_months("2026-12-01", 1).unwrap(), "2027-01-01");
        assert_eq!(months_diff("2026-01-01", "2026-04-01").unwrap(), 3);
    }

    #[test]
    fn repeat_rule_matching() {
        assert!(month_in_rule("2026-01-01", None, "2026-07-01", "monthly").unwrap());
        assert!(month_in_rule("2026-01-01", None, "2026-07-01", "quarterly").unwrap());
        assert!(!month_in_rule("2026-01-01", None, "2026-08-01", "quarterly").unwrap());
        assert!(month_in_rule("2026-01-01", None, "2027-01-01", "yearly").unwrap());
        assert!(month_in_rule("2026-01-01", None, "2026-01-01", "once").unwrap());
        assert!(!month_in_rule("2026-01-01", None, "2026-02-01", "once").unwrap());
    }
}
