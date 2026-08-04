/**
 * An expense claim moves through a fixed sequence, not a free choice of status:
 *
 *     Pending ──► Approved ──► Paid
 *         │
 *         └────► Rejected
 *
 * Approval is a decision about company money, so it is recorded rather than
 * simply set: who approved or rejected it, and when.
 *
 * Only a pending claim can be edited. Once someone has approved it, the amount
 * and description are what they agreed to, and changing them afterwards would
 * make the approval meaningless.
 */

export const EXPENSE_STATUSES = ["pending", "approved", "rejected", "paid", "reimbursed"];

/** 'reimbursed' is the older name for 'paid' — the same end of the road. */
const SETTLED = ["paid", "reimbursed"];

export const expenseStatus = (expense) => expense?.status || "pending";

export const isSettled = (expense) => SETTLED.includes(expenseStatus(expense));
export const isRejected = (expense) => expenseStatus(expense) === "rejected";
export const isAwaitingApproval = (expense) => expenseStatus(expense) === "pending";

/** Editing is a pending-only privilege — an approved claim is a decision. */
export const canEditExpense = (expense) => expenseStatus(expense) === "pending";

/**
 * The steps available from here — two while pending, since a claim can be
 * turned down as readily as approved.
 *
 * @returns {{to: string, label: string, destructive?: boolean}[]}
 */
export function expenseTransitions(expense) {
  switch (expenseStatus(expense)) {
    case "pending":
      return [
        { to: "approved", label: "Approve" },
        { to: "rejected", label: "Reject", destructive: true },
      ];
    case "approved":
      return [{ to: "paid", label: "Mark as Paid" }];
    default:
      return []; // rejected, paid or reimbursed — nothing further
  }
}

/** Guards the transition itself, so the flow cannot be jumped. */
export const canTransitionExpense = (expense, to) =>
  expenseTransitions(expense).some((step) => step.to === to);

/**
 * Whether the claim counts as company cost.
 *
 * A rejected claim is money the company decided not to pay, so counting it
 * would overstate cost and understate margin. A pending one is still counted:
 * it is a liability already incurred, awaiting sign-off rather than in doubt.
 */
export const countsAsCost = (expense) => !isRejected(expense);

/** Claims that count as cost, ready to sum. */
export const costBearingExpenses = (expenses) =>
  (Array.isArray(expenses) ? expenses : []).filter(countsAsCost);
