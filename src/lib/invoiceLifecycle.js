import { parseISO, isValid, startOfDay } from "date-fns";

/**
 * An invoice moves through a fixed sequence, not a free choice of status:
 *
 *     Draft ──► Sent ──► Paid
 *                 │
 *                 └─ Overdue (once the due date passes)
 *
 * Overdue is never set by hand. It is derived from the due date, so an invoice
 * becomes overdue on the right day without anyone remembering to change it —
 * and stops being overdue the moment it is paid.
 *
 * Only a draft can be edited. Once an invoice has gone to a client, its number
 * and amounts are a record of what they were sent.
 */

export const INVOICE_STATUSES = ["draft", "sent", "overdue", "paid", "cancelled"];

/** Statuses the user can actually put an invoice into. */
export const SETTABLE_STATUSES = ["draft", "sent", "paid", "cancelled"];

/**
 * What the invoice actually is right now, accounting for the due date.
 *
 * @param {object} invoice
 * @param {Date} [now] - injectable for testing.
 */
export function effectiveStatus(invoice, now = new Date()) {
  const stored = invoice?.status || "draft";
  if (stored === "paid" || stored === "cancelled" || stored === "draft") return stored;

  // Stored 'sent' or the legacy stored 'overdue' — the due date decides.
  const due = invoice?.due_date ? parseISO(invoice.due_date) : null;
  if (due && isValid(due) && due < startOfDay(now)) return "overdue";
  return "sent";
}

export const isOverdue = (invoice, now) => effectiveStatus(invoice, now) === "overdue";

/** Editing is a draft-only privilege — a sent invoice is a record. */
export const canEditInvoice = (invoice) => (invoice?.status || "draft") === "draft";

/**
 * The single step available from here, or null at the end of the flow.
 * @returns {{to: string, label: string}|null}
 */
export function nextTransition(invoice, now = new Date()) {
  switch (effectiveStatus(invoice, now)) {
    case "draft": return { to: "sent", label: "Mark as Sent" };
    case "sent":
    case "overdue": return { to: "paid", label: "Mark as Paid" };
    default: return null; // paid or cancelled — nothing further
  }
}

/** Guards the transition itself, so the flow cannot be jumped. */
export function canTransition(invoice, to, now = new Date()) {
  const next = nextTransition(invoice, now);
  return !!next && next.to === to;
}

/** Counts toward money owed: sent or overdue, never draft, paid or cancelled. */
export const isOutstanding = (invoice, now) =>
  ["sent", "overdue"].includes(effectiveStatus(invoice, now));
