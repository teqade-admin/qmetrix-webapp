/**
 * Compute performance metrics for an employee from their timesheet entries.
 * Utilisation = billable / total logged hours. Revenue = billable hours × charge-out rate.
 */
export function computePerformance(employee, timesheets = []) {
  const name = employee?.full_name;
  const rows = timesheets.filter(t => t.employee_name === name);
  const totalHours = rows.reduce((s, t) => s + (t.hours || 0), 0);
  const billableHours = rows.filter(t => t.billable).reduce((s, t) => s + (t.hours || 0), 0);
  const nonBillableHours = totalHours - billableHours;
  const utilisation = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
  const rate = Number(employee?.hourly_rate) || 0;
  const revenue = billableHours * rate;
  const projectCount = new Set(rows.map(t => t.project_name).filter(Boolean)).size;
  return { totalHours, billableHours, nonBillableHours, utilisation, revenue, projectCount };
}
