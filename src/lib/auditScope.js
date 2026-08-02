import { getSubordinates, getSubordinatesToDepth } from "@/lib/orgHierarchy";
import { normalizeRole } from "@/lib/permissions";

/**
 * Who someone may see audit entries for.
 *
 *   self     — only their own actions
 *   team     — themselves plus everyone reporting under them, to a chosen depth
 *              (L1 = direct reports, L2 = their reports too, and so on)
 *   everyone — the whole company. Super Admin only, which also covers the
 *              co-Super-Admins who sit outside anyone's reporting line.
 *
 * Everyone can always see their own actions, so "self" needs no privilege.
 */

export const AUDIT_SCOPES = { SELF: "self", TEAM: "team", EVERYONE: "everyone" };

export const canSeeEveryone = (role) => normalizeRole(role) === "super_admin";

/** Scopes this user may choose between, given their role and whether they manage anyone. */
export function availableScopes(role, employees, employeeId) {
  const scopes = [AUDIT_SCOPES.SELF];
  if (employeeId && getSubordinates(employees, employeeId).length > 0) {
    scopes.push(AUDIT_SCOPES.TEAM);
  }
  if (canSeeEveryone(role)) scopes.push(AUDIT_SCOPES.EVERYONE);
  return scopes;
}

/**
 * Employee ids whose actions are visible.
 *
 * @param {string} scope   - one of AUDIT_SCOPES.
 * @param {number} depth   - team depth; 0/undefined means every level.
 * @returns {Set<string>|null} null means "no restriction" (whole company).
 */
export function visibleActorIds({ scope, role, employees = [], employeeId, depth = 0 }) {
  if (scope === AUDIT_SCOPES.EVERYONE && canSeeEveryone(role)) return null;

  const ids = new Set();
  if (employeeId) ids.add(employeeId);

  if (scope === AUDIT_SCOPES.TEAM && employeeId) {
    const reports = depth > 0
      ? getSubordinatesToDepth(employees, employeeId, depth)
      : getSubordinates(employees, employeeId);
    reports.forEach((e) => ids.add(e.id));
  }
  return ids;
}

/**
 * Apply scope and the module/action/search filters to audit rows.
 *
 * Entries whose actor is unknown (`actor_employee_id` null — a change made
 * outside the app, or by a since-deleted employee) are only visible company-wide,
 * since there is no way to place them in a reporting line.
 */
export function filterAuditLogs(logs = [], { actorIds, module = "all", action = "all", search = "" }) {
  const q = search.trim().toLowerCase();
  return (Array.isArray(logs) ? logs : []).filter((log) => {
    if (actorIds && !(log?.actor_employee_id && actorIds.has(log.actor_employee_id))) return false;
    if (module !== "all" && log?.module !== module) return false;
    if (action !== "all" && log?.action !== action) return false;
    if (!q) return true;
    const fields = [log?.actor_name, log?.module, log?.record_label, log?.table_name, log?.action];
    if (fields.some((v) => (v || "").toLowerCase().includes(q))) return true;
    // Searching by field name should find the entries that touched it.
    return Object.keys(log?.changes || {}).some((k) => k.toLowerCase().includes(q));
  });
}

/** `{field: {from, to}}` → a readable list, with noisy internals dropped. */
const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "onboarding_checklist"]);

export function describeChanges(changes) {
  return Object.entries(changes || {})
    .filter(([field]) => !HIDDEN_FIELDS.has(field))
    .map(([field, { from, to }]) => ({
      field: field.replace(/_/g, " "),
      from: formatValue(from),
      to: formatValue(to),
    }));
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "…";
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}
