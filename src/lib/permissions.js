/**
 * Central role-based access control (frontend gating).
 *
 * Effective role = the signed-in user's employee `app_role`. Pages are gated by
 * a capability level; nav, route access and action buttons all read from here.
 */

export const ROLES = [
  "super_admin", "hr_admin", "hr_user", "ops_admin", "ops_user", "finance_admin", "finance_user",
];

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  hr_user: "HR User",
  ops_admin: "Ops Admin",
  ops_user: "Ops User",
  finance_admin: "Finance Admin",
  finance_user: "Finance User",
};

// Map the legacy app_role / roles-table names onto the new model.
export const LEGACY_ROLE_MAP = {
  admin: "super_admin",
  hr: "hr_admin",
  finance: "finance_admin",
  billing: "finance_user",
  project_manager: "ops_admin",
  qs: "ops_user",
  reviewer: "ops_user",
  approver: "ops_user",
};

export const normalizeRole = (role) =>
  !role ? null : (ROLES.includes(role) ? role : (LEGACY_ROLE_MAP[role] || null));

// Capability levels.
export const NONE = 0, READ = 1, WRITE = 2, FULL = 3;

const HR_PAGES = ["HRModule", "KPIPerformance", "TimeManagement", "ResourceAllocation", "ResourceMonitor"];
const OPS_PAGES = ["BidManagement", "Projects", "DeliveryModule", "WorkflowDashboard"];
const FIN_PAGES = ["CostValueDashboard", "Finance"];

const lvl = (pages, level) => Object.fromEntries(pages.map(p => [p, level]));

// HR section is readable by Finance/Ops EXCEPT the Employment and Resource Monitor pages.
const HR_READ_FOR_OUTSIDERS = { KPIPerformance: READ, TimeManagement: READ, ResourceAllocation: READ };

const MATRIX = {
  super_admin: { __default: FULL },
  hr_admin: { ...lvl(HR_PAGES, FULL), Dashboard: READ },
  hr_user: {
    HRModule: WRITE, KPIPerformance: WRITE, TimeManagement: WRITE,
    ResourceAllocation: WRITE, ResourceMonitor: READ, Dashboard: READ,
  },
  ops_admin: { ...lvl(OPS_PAGES, FULL), ...HR_READ_FOR_OUTSIDERS, Dashboard: READ },
  ops_user: {
    BidManagement: NONE, Projects: READ, DeliveryModule: READ, WorkflowDashboard: READ,
    ...HR_READ_FOR_OUTSIDERS, Dashboard: READ,
  },
  finance_admin: { ...lvl(FIN_PAGES, FULL), ...HR_READ_FOR_OUTSIDERS, Dashboard: READ },
  finance_user: { ...lvl(FIN_PAGES, WRITE), ...HR_READ_FOR_OUTSIDERS, Dashboard: READ },
};

/** Capability level a role has on a page. */
export function levelFor(role, page) {
  const r = normalizeRole(role);
  if (!r) return NONE;
  if (page === "Profile") return WRITE;        // everyone manages their own profile
  if (page === "Team") return READ;            // team directory is visible to all roles
  // Shared document repository: everyone can view & upload; only Super Admin deletes.
  // Folder visibility within the page is further scoped by role (see foldersForRole).
  if (page === "DataManagement") return r === "super_admin" ? FULL : WRITE;
  const m = MATRIX[r];
  if (!m) return NONE;
  if (m.__default != null) return m.__default;  // super_admin
  return m[page] ?? NONE;
}

export const canRead = (role, page) => levelFor(role, page) >= READ;
export const canWrite = (role, page) => levelFor(role, page) >= WRITE;
export const canDelete = (role, page) => levelFor(role, page) >= FULL;

/** Roles this role may grant via the Employment "System Role" dropdown. */
export function assignableRoles(role) {
  const r = normalizeRole(role);
  if (r === "super_admin") return [...ROLES];
  if (r === "hr_admin") return ROLES.filter(x => x !== "super_admin");
  if (r === "hr_user") return ROLES.filter(x => x.endsWith("_user")); // *_user only, no admins
  return [];
}

// Roles that see every employee in the HR "Team" views (vs. just their reports).
export const MANAGER_ROLES = ["super_admin", "hr_admin", "hr_user"];
export const isManagerRole = (role) => MANAGER_ROLES.includes(normalizeRole(role));

// Data Management folders, each scoped to the page whose data it holds.
// "Templates" / "General" are shared with everyone.
const FOLDER_PAGE = {
  Projects: "Projects",
  Bids: "BidManagement",
  HR: "HRModule",
  Finance: "Finance",
  Templates: null,
  General: null,
};

/** Folders the role may see in Data Management (shared folders always included). */
export function foldersForRole(role) {
  return Object.keys(FOLDER_PAGE).filter(
    (f) => FOLDER_PAGE[f] === null || canRead(role, FOLDER_PAGE[f])
  );
}
