import { getSubordinates } from "@/lib/orgHierarchy";
import { canWrite, canDelete, normalizeRole } from "@/lib/permissions";

/**
 * Who can see and change what, for projects and the work assigned on them.
 *
 * Two separate questions, deliberately kept apart:
 *
 *   Visibility — Ops Admin (and Super Admin) see every project. Everyone else
 *                sees only projects they are involved in: managing one, having
 *                created it, or being assigned a work section on it.
 *
 *   Authority  — the person who created a project may edit and delete it. The
 *                project manager may edit but not delete, because deleting
 *                takes the work sections with it. Older projects have no
 *                recorded creator, so the manager stands in as owner rather
 *                than leaving them undeletable.
 */

/** Does this role see the whole portfolio, or only its own involvement? */
export const seesAllProjects = (role) => canDelete(role, "Projects");

/** Project ids a person has work assigned on. */
export const projectIdsAssignedTo = (sections, employeeId) =>
  new Set(
    (Array.isArray(sections) ? sections : [])
      .filter((s) => employeeId && s?.assignee_id === employeeId)
      .map((s) => s.project_id)
  );

/**
 * Narrow a project list to what this person may see.
 *
 * @param {object[]} projects
 * @param {{role: string, employee: object|null, sections: object[]}} ctx
 */
export function visibleProjects(projects, { role, employee, sections = [] }) {
  const list = Array.isArray(projects) ? projects : [];
  if (seesAllProjects(role)) return list;
  if (!employee) return [];

  const assigned = projectIdsAssignedTo(sections, employee.id);
  return list.filter((p) =>
    assigned.has(p.id) ||
    p.created_by === employee.id ||
    (p.project_manager && p.project_manager === employee.full_name)
  );
}

/** The project's owner: whoever created it, or the manager for older records. */
export const isProjectOwner = (project, employee) => {
  if (!project || !employee) return false;
  if (project.created_by) return project.created_by === employee.id;
  // No recorded creator (created before ownership was tracked) — fall back to
  // the manager so the project isn't left with nobody able to remove it.
  return !!project.project_manager && project.project_manager === employee.full_name;
};

export const isProjectManager = (project, employee) =>
  !!project?.project_manager && !!employee && project.project_manager === employee.full_name;

/**
 * Edit is open to the owner and the project manager; delete only to the owner.
 * A Super Admin is never locked out of their own system.
 */
export function projectPermissions(project, { role, employee }) {
  const isSuper = normalizeRole(role) === "super_admin";
  const owner = isProjectOwner(project, employee);
  const manager = isProjectManager(project, employee);
  const hasWrite = canWrite(role, "Projects");

  return {
    canEdit: isSuper || (hasWrite && (owner || manager)),
    canDelete: isSuper || (hasWrite && owner),
    isOwner: owner,
    isManager: manager,
  };
}

/**
 * Work sections a person may see: their own, plus anyone reporting under them
 * at any depth. Projects write access sees everything, since they assign it.
 */
export function visibleWorkSections(sections, { role, employee, employees = [] }) {
  const list = Array.isArray(sections) ? sections : [];
  if (canWrite(role, "Projects")) return list;
  if (!employee) return [];

  const allowed = new Set([employee.id, ...getSubordinates(employees, employee.id).map((e) => e.id)]);
  return list.filter((s) => allowed.has(s.assignee_id));
}
