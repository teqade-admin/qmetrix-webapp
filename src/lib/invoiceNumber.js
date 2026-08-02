/**
 * Invoice numbering: INV-YYYY-NNN (e.g. INV-2026-007).
 *
 * The sequence is scoped to the calendar year and restarts at 001 each January,
 * which is what the year in the number is for. Numbers are allocated from the
 * invoices already on record, and `invoice_number` carries a UNIQUE constraint
 * in Postgres, so the generator also skips anything already taken rather than
 * handing back a value the insert would reject.
 */

export const INVOICE_NUMBER_PATTERN = /^INV-(\d{4})-(\d{3,})$/;

const SEQUENCE_DIGITS = 3;

/** `INV-2026-007` → `{ year: 2026, sequence: 7 }`; anything else → null. */
export function parseInvoiceNumber(value) {
  const match = String(value ?? "").trim().match(INVOICE_NUMBER_PATTERN);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** `(2026, 7)` → `INV-2026-007`. Sequences past 999 simply grow wider. */
export const formatInvoiceNumber = (year, sequence) =>
  `INV-${year}-${String(sequence).padStart(SEQUENCE_DIGITS, "0")}`;

export const isValidInvoiceNumber = (value) => parseInvoiceNumber(value) !== null;

/**
 * The next number to issue: one past the highest sequence already used **this
 * year**. Numbers in a different format (or a different year) are ignored for
 * the sequence but still respected as taken, so no duplicate can be produced.
 *
 * @param {{invoice_number?: string}[]} invoices - existing invoices.
 * @param {Date} [now] - injectable for testing / year rollover.
 */
export function nextInvoiceNumber(invoices = [], now = new Date()) {
  const year = now.getFullYear();
  const list = Array.isArray(invoices) ? invoices : [];

  const taken = new Set(list.map((i) => String(i?.invoice_number ?? "").trim()));

  const highest = list.reduce((max, invoice) => {
    const parsed = parseInvoiceNumber(invoice?.invoice_number);
    return parsed && parsed.year === year ? Math.max(max, parsed.sequence) : max;
  }, 0);

  let sequence = highest + 1;
  while (taken.has(formatInvoiceNumber(year, sequence))) sequence++;
  return formatInvoiceNumber(year, sequence);
}
