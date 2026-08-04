import { isOutstanding } from "@/lib/invoiceLifecycle";
import { costBearingExpenses } from "@/lib/expenseLifecycle";

/**
 * Company-level finance figures, defined once so every page reports the same
 * number. The Dashboard and Cost & Value previously each computed Gross Margin
 * their own way — same revenue, different cost bases — and disagreed by
 * hundreds of percentage points for the same company.
 */

const sum = (list, pick) =>
  (Array.isArray(list) ? list : []).reduce((total, item) => total + (Number(pick(item)) || 0), 0);

const invoiceValue = (invoice) => invoice?.total_amount || invoice?.amount || 0;

/** Value of work actually done: agreed fee weighted by each project's progress. */
export const earnedValue = (projects) =>
  sum(projects, (p) => (p?.fee_agreed || 0) * ((p?.progress_percent || 0) / 100));

/**
 * Cost incurred earning it: delivery cost to date plus expense claims.
 *
 * Rejected claims are left out — that is money the company decided not to pay,
 * and counting it would overstate cost and understate margin.
 */
export const totalCost = (projects, expenses) =>
  sum(projects, (p) => p?.cost_to_date) + sum(costBearingExpenses(expenses), (e) => e?.amount);

/** Everything billed to clients. A cancelled invoice was never billed. */
export const totalInvoiced = (invoices) =>
  sum((invoices || []).filter((i) => i?.status !== "cancelled"), invoiceValue);

/** The same, for one project — the Projects and Cost & Value per-row figures. */
export const invoicedForProject = (invoices, projectName) =>
  totalInvoiced((invoices || []).filter((i) => i?.project_name === projectName));

/** Total value of the work the company has agreed to do. */
export const totalFeeAgreed = (projects) => sum(projects, (p) => p?.fee_agreed);

/** Delivery cost booked against projects, before expense claims. */
export const totalProjectCost = (projects) => sum(projects, (p) => p?.cost_to_date);

export const totalPaid = (invoices) =>
  sum((invoices || []).filter((i) => i?.status === "paid"), invoiceValue);

export const totalOutstanding = (invoices) =>
  sum((invoices || []).filter((i) => isOutstanding(i)), invoiceValue);

/**
 * Gross margin on an earned-value basis: the value of work done, less what it
 * cost to do, as a percentage of that value.
 *
 * Revenue is deliberately NOT invoiced-or-paid. Costs accrue as work happens
 * but billing lags it, so measuring full costs against partial billing reports
 * a loss that is really just a timing difference.
 *
 * @returns {number|null} percentage, or null when no work has been earned yet
 *   (callers should show "—" rather than 0%, which would read as break-even).
 */
export function grossMargin(projects, expenses) {
  const revenue = earnedValue(projects);
  if (revenue <= 0) return null;
  return ((revenue - totalCost(projects, expenses)) / revenue) * 100;
}
