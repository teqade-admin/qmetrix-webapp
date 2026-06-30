/**
 * Auto-computed KPI scorecard.
 *
 * The KPI score is the weighted attainment of measurable targets, computed from
 * timesheet data for a chosen period — not a typed number. Targets/weights come
 * from the admin KPI config (app_settings.kpi_config), with sensible defaults.
 */

export const DEFAULT_KPI_CONFIG = {
  utilisation_target: 80,   // %
  billable_weekly: 30,      // billable hours per week
  weight_utilisation: 40,
  weight_billable: 30,
  weight_revenue: 30,
};

export function resolveKpiConfig(raw) {
  return { ...DEFAULT_KPI_CONFIG, ...(raw || {}) };
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const DAY = 24 * 60 * 60 * 1000;

/** Build the selectable period options: the last N quarters plus this/last year. */
export function periodOptions(now = new Date()) {
  const opts = [];
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) + 1;
  // last 6 quarters, newest first
  let yy = y, qq = q;
  for (let i = 0; i < 6; i++) {
    opts.push({ key: `${yy}-Q${qq}`, label: `${yy} Q${qq}` });
    qq -= 1; if (qq === 0) { qq = 4; yy -= 1; }
  }
  opts.push({ key: `${y}`, label: `${y} (full year)` });
  opts.push({ key: `${y - 1}`, label: `${y - 1} (full year)` });
  return opts;
}

/** Resolve a period key ("2026-Q2" or "2026") to an inclusive date range. */
export function periodRange(key) {
  const qMatch = /^(\d{4})-Q([1-4])$/.exec(key);
  if (qMatch) {
    const yr = Number(qMatch[1]);
    const qtr = Number(qMatch[2]);
    const startMonth = (qtr - 1) * 3;
    const start = new Date(yr, startMonth, 1);
    const end = new Date(yr, startMonth + 3, 0); // last day of quarter
    return { start, end, label: `${yr} Q${qtr}` };
  }
  const yr = Number(key);
  return { start: new Date(yr, 0, 1), end: new Date(yr, 11, 31), label: `${yr}` };
}

function withinRange(dateStr, range) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}

/**
 * Compute the scorecard for an employee over a period.
 * Returns metrics, per-metric attainment, and the weighted KPI score (0-100).
 */
export function computeScorecard(employee, timesheets = [], range, config) {
  const cfg = resolveKpiConfig(config);
  const rows = timesheets.filter(t => t.employee_name === employee?.full_name && withinRange(t.date, range));

  const totalHours = rows.reduce((s, t) => s + (t.hours || 0), 0);
  const billableHours = rows.filter(t => t.billable).reduce((s, t) => s + (t.hours || 0), 0);
  const nonBillableHours = totalHours - billableHours;
  const utilisation = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
  const rate = Number(employee?.hourly_rate) || 0;
  const revenue = billableHours * rate;
  const projectCount = new Set(rows.map(t => t.project_name).filter(Boolean)).size;

  const weeks = Math.max(1, Math.round(((range.end - range.start) / DAY + 1) / 7));
  const billableTarget = cfg.billable_weekly * weeks;
  const revenueTarget = billableTarget * rate;

  const utilAttain = clamp01(utilisation / (cfg.utilisation_target || 1));
  const billAttain = billableTarget > 0 ? clamp01(billableHours / billableTarget) : 0;
  const revAttain = revenueTarget > 0 ? clamp01(revenue / revenueTarget) : 0;

  const wU = cfg.weight_utilisation, wB = cfg.weight_billable, wR = cfg.weight_revenue;
  const wSum = (wU + wB + wR) || 1;
  const kpiScore = Math.round(((utilAttain * wU + billAttain * wB + revAttain * wR) / wSum) * 100);

  const metrics = [
    { key: "utilisation", label: "Utilisation", actual: utilisation, target: cfg.utilisation_target, unit: "%", attainment: utilAttain, weight: wU },
    { key: "billable", label: "Billable Hours", actual: billableHours, target: billableTarget, unit: "h", attainment: billAttain, weight: wB },
    { key: "revenue", label: "Revenue", actual: revenue, target: revenueTarget, unit: "money", attainment: revAttain, weight: wR },
  ];

  return { totalHours, billableHours, nonBillableHours, utilisation, revenue, projectCount, kpiScore, metrics, weeks };
}
