/**
 * Helpers for the employee reporting hierarchy (manager_id self-reference).
 * A manager can themselves report to another manager, so the tree can be many
 * levels deep. These helpers walk that tree defensively (cycle-safe).
 */

/** Map of managerId -> array of direct-report employees. */
export function buildReportsByManager(employees = []) {
  const byManager = new Map();
  for (const e of employees) {
    if (!e.manager_id) continue;
    if (!byManager.has(e.manager_id)) byManager.set(e.manager_id, []);
    byManager.get(e.manager_id).push(e);
  }
  return byManager;
}

/**
 * All employees that report (directly or indirectly) to managerId.
 * Excludes the manager themselves. Cycle-safe via a visited set.
 */
export function getSubordinates(employees, managerId, { includeSelf = false } = {}) {
  if (!managerId) return [];
  const byManager = buildReportsByManager(employees);
  const result = [];
  const visited = new Set();
  const stack = [...(byManager.get(managerId) || [])];
  while (stack.length) {
    const emp = stack.pop();
    if (!emp || visited.has(emp.id)) continue;
    visited.add(emp.id);
    result.push(emp);
    stack.push(...(byManager.get(emp.id) || []));
  }
  if (includeSelf) {
    const self = employees.find(e => e.id === managerId);
    if (self) result.unshift(self);
  }
  return result;
}

/** Direct reports only. */
export function getDirectReports(employees, managerId) {
  if (!managerId) return [];
  return employees.filter(e => e.manager_id === managerId);
}

/** Subordinates down to `maxDepth` levels (1 = direct reports). Cycle-safe. */
export function getSubordinatesToDepth(employees, managerId, maxDepth) {
  if (!managerId || maxDepth < 1) return [];
  const byManager = buildReportsByManager(employees);
  const result = [];
  const visited = new Set();
  let frontier = byManager.get(managerId) || [];
  let depth = 1;
  while (frontier.length && depth <= maxDepth) {
    const next = [];
    for (const emp of frontier) {
      if (visited.has(emp.id)) continue;
      visited.add(emp.id);
      result.push(emp);
      next.push(...(byManager.get(emp.id) || []));
    }
    frontier = next;
    depth += 1;
  }
  return result;
}

/** Number of levels in the reporting tree below `managerId` (0 = no reports). */
export function subtreeDepth(employees, managerId) {
  const byManager = buildReportsByManager(employees);
  const visited = new Set();
  let frontier = byManager.get(managerId) || [];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next = [];
    for (const emp of frontier) {
      if (visited.has(emp.id)) continue;
      visited.add(emp.id);
      next.push(...(byManager.get(emp.id) || []));
    }
    frontier = next;
  }
  return depth;
}

/**
 * Ids that may NOT be chosen as a person's manager: themselves plus everyone
 * already beneath them (choosing one of those would create a cycle).
 */
export function getInvalidManagerIds(employees, employeeId) {
  if (!employeeId) return new Set();
  const blocked = new Set([employeeId]);
  for (const sub of getSubordinates(employees, employeeId)) blocked.add(sub.id);
  return blocked;
}

/** Walk up the management chain from an employee to the top. Cycle-safe. */
export function getManagerChain(employees, employeeId) {
  const byId = new Map(employees.map(e => [e.id, e]));
  const chain = [];
  const visited = new Set();
  let current = byId.get(employeeId);
  while (current?.manager_id && !visited.has(current.manager_id)) {
    visited.add(current.manager_id);
    const mgr = byId.get(current.manager_id);
    if (!mgr) break;
    chain.push(mgr);
    current = mgr;
  }
  return chain;
}
