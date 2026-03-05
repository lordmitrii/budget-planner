#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct MonthDelta {
    pub recurring: f64,
    pub planned_events: f64,
    pub corrections: f64,
}

impl MonthDelta {
    pub fn total(self) -> f64 {
        self.recurring + self.planned_events + self.corrections
    }
}

pub fn next_balance(previous_close: f64, month_delta: MonthDelta) -> f64 {
    previous_close + month_delta.total()
}

pub fn variance(actual: f64, projected: f64) -> f64 {
    actual - projected
}

#[cfg(test)]
pub fn variance_ratio(actual: f64, projected: f64) -> Option<f64> {
    if projected.abs() < f64::EPSILON {
        return None;
    }
    Some((actual - projected) / projected)
}

#[cfg(test)]
pub fn project_balances(starting_close: f64, monthly_deltas: &[MonthDelta]) -> Vec<f64> {
    let mut out = Vec::with_capacity(monthly_deltas.len());
    let mut current = starting_close;

    for delta in monthly_deltas {
        current = next_balance(current, *delta);
        out.push(current);
    }

    out
}

#[cfg(test)]
mod tests {
    use super::{next_balance, project_balances, variance, variance_ratio, MonthDelta};

    #[test]
    fn month_delta_total_adds_all_components() {
        let delta = MonthDelta {
            recurring: 100.0,
            planned_events: -35.5,
            corrections: 5.5,
        };
        assert_eq!(delta.total(), 70.0);
    }

    #[test]
    fn next_balance_handles_positive_and_negative_deltas() {
        let opening = 1200.0;
        let delta = MonthDelta {
            recurring: 300.0,
            planned_events: -100.0,
            corrections: -25.0,
        };
        assert_eq!(next_balance(opening, delta), 1375.0);
    }

    #[test]
    fn next_balance_no_change_when_delta_zero() {
        let opening = 999.99;
        assert_eq!(next_balance(opening, MonthDelta::default()), 999.99);
    }

    #[test]
    fn variance_is_actual_minus_projected() {
        assert_eq!(variance(1050.0, 1000.0), 50.0);
        assert_eq!(variance(930.0, 1000.0), -70.0);
    }

    #[test]
    fn variance_ratio_returns_none_when_projected_is_zero() {
        assert_eq!(variance_ratio(100.0, 0.0), None);
        assert_eq!(variance_ratio(0.0, 0.0), None);
    }

    #[test]
    fn variance_ratio_returns_relative_delta() {
        let ratio = variance_ratio(110.0, 100.0).expect("ratio should exist");
        assert!((ratio - 0.10).abs() < 1e-12);

        let negative = variance_ratio(90.0, 100.0).expect("ratio should exist");
        assert!((negative + 0.10).abs() < 1e-12);
    }

    #[test]
    fn project_balances_runs_cumulative_forecast() {
        let deltas = vec![
            MonthDelta {
                recurring: 100.0,
                planned_events: 0.0,
                corrections: 0.0,
            },
            MonthDelta {
                recurring: 100.0,
                planned_events: -50.0,
                corrections: 20.0,
            },
            MonthDelta {
                recurring: 100.0,
                planned_events: -100.0,
                corrections: 0.0,
            },
        ];

        let projected = project_balances(1000.0, &deltas);
        assert_eq!(projected, vec![1100.0, 1170.0, 1170.0]);
    }

    #[test]
    fn project_balances_empty_input_returns_empty_output() {
        let projected = project_balances(500.0, &[]);
        assert!(projected.is_empty());
    }
}
