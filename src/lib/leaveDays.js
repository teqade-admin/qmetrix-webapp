import { differenceInCalendarDays, eachDayOfInterval, isValid, isWeekend, parseISO } from "date-fns";

/**
 * Working days covered by a leave request.
 *
 * Counts the business days in the inclusive range rather than deriving them
 * from a difference. `differenceInBusinessDays(end, start) + 1` looks
 * equivalent but adds a day that may not exist: a Saturday-to-Sunday request
 * came out as 1 working day instead of 0.
 *
 * Weekends are excluded. Public holidays are not modelled — there is no
 * holiday calendar in the system yet.
 */

// A single request longer than this is a typo (usually a mistyped year), not a
// real booking. Guards against values like "52179 working days".
export const MAX_LEAVE_SPAN_DAYS = 366;

export const LEAVE_DATE_ERRORS = {
  INVALID: "Enter valid start and end dates.",
  ORDER: "End date can't be before the start date.",
  TOO_LONG: `A single leave request can't span more than ${MAX_LEAVE_SPAN_DAYS} days. Check the dates.`,
  NO_WORKING_DAYS: "Those dates fall entirely on a weekend, so there are no working days to book.",
};

/**
 * @returns {{days: number|null, error: string|null}} `days` is the working-day
 *   count (0 when the range is all weekend); `error` is a message to show and
 *   means the range is unusable.
 */
export function workingDaysBetween(start, end) {
  if (!start || !end) return { days: null, error: null };

  const from = parseISO(start);
  const to = parseISO(end);
  if (!isValid(from) || !isValid(to)) return { days: null, error: LEAVE_DATE_ERRORS.INVALID };
  if (differenceInCalendarDays(to, from) < 0) return { days: null, error: LEAVE_DATE_ERRORS.ORDER };
  if (differenceInCalendarDays(to, from) > MAX_LEAVE_SPAN_DAYS) {
    return { days: null, error: LEAVE_DATE_ERRORS.TOO_LONG };
  }

  const days = eachDayOfInterval({ start: from, end: to }).filter((d) => !isWeekend(d)).length;
  if (days === 0) return { days: 0, error: LEAVE_DATE_ERRORS.NO_WORKING_DAYS };
  return { days, error: null };
}

/** Working-day count for display, or "" when the range isn't usable. */
export function workingDaysValue(start, end) {
  const { days, error } = workingDaysBetween(start, end);
  return error || days == null ? "" : days;
}
