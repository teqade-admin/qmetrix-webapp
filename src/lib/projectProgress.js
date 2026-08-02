/**
 * Progress is DERIVED, never typed in, and it works on two levels:
 *
 *   Work section → a package of work (substructure, M&E, façade…). Each one
 *                  carries its own percent complete and is mapped to a RIBA stage.
 *   Stage        → the average of the work sections mapped to that stage.
 *   Project      → position along the RIBA ladder: every stage you have passed
 *                  counts in full, and the stage you are on counts its own
 *                  progress. So closing out a stage always moves the project on,
 *                  even for a stage that had no sections to track.
 *
 * Stages are also gated: you cannot leave a stage whose sections are unfinished.
 *
 * This is the single definition — Projects, the Dashboard and the Cost & Value
 * earned-value calculation all read the `progress_percent` it produces.
 */

export const RIBA_STAGES = [
  "stage_0", "stage_1", "stage_2", "stage_3", "stage_4", "stage_5", "stage_6", "stage_7",
];

export const stageLabel = (stage) =>
  String(stage || "").replace(/_/g, " ").replace("stage", "Stage");

// Section values come from a free-text number input, so treat anything
// non-numeric as 0 and keep the result inside 0–100.
const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const asList = (sections) => (Array.isArray(sections) ? sections.filter(Boolean) : []);

/**
 * Average percent across a set of sections.
 * @returns {number|null} 0–100, or null when the set is empty — "not measurable
 *   yet", which callers should show as "—" rather than a misleading 0%.
 */
export function sectionsProgress(sections) {
  const list = asList(sections);
  if (list.length === 0) return null;
  const total = list.reduce((sum, s) => sum + clampPercent(s?.progress_percent), 0);
  return Math.round(total / list.length);
}

/** Sections mapped to a given stage. */
export const sectionsForStage = (sections, stage) =>
  asList(sections).filter((s) => s?.riba_stage === stage);

/** Sections not yet mapped to any stage — they count toward nothing. */
export const unassignedSections = (sections) =>
  asList(sections).filter((s) => !s?.riba_stage);

/** Progress of one stage: the average of its sections, or null if it has none. */
export const stageProgress = (sections, stage) =>
  sectionsProgress(sectionsForStage(sections, stage));

// A section only counts as done when it has been filled in, not merely dragged
// to 100% — a nameless, dateless, unassigned section at 100% says nothing about
// the work. Kept as label text so the UI can name what's missing.
export const SECTION_REQUIRED_FIELDS = [
  { key: "title", label: "title" },
  { key: "start_date", label: "start date" },
  { key: "end_date", label: "end date" },
  { key: "assigned_to", label: "assignee" },
];

// Project setup that must exist before the project advances at all.
export const PROJECT_REQUIRED_FIELDS = [
  { key: "project_manager", label: "project manager" },
  { key: "fee_agreed", label: "agreed fee" },
  { key: "start_date", label: "start date" },
  { key: "end_date", label: "end date" },
];

const isBlank = (value) => value == null || String(value).trim() === "";

/** Required fields a work section is still missing, by label. */
export const missingSectionFields = (section) =>
  SECTION_REQUIRED_FIELDS.filter((f) => isBlank(section?.[f.key])).map((f) => f.label);

/** Required project fields still missing, by label. */
export const missingProjectFields = (project) =>
  PROJECT_REQUIRED_FIELDS.filter((f) => isBlank(project?.[f.key])).map((f) => f.label);

/**
 * A stage blocks progress if it has sections that aren't finished — meaning
 * every required field filled AND 100% complete.
 *
 * A stage with no sections is nothing to wait for, so it never blocks.
 */
export const isStageComplete = (sections, stage) => {
  const list = sectionsForStage(sections, stage);
  if (list.length === 0) return true;
  if (list.some((s) => missingSectionFields(s).length > 0)) return false;
  return sectionsProgress(list) === 100;
};

/** Why a stage isn't done yet, or "" when it is. */
export const stageBlockReason = (sections, stage) => {
  const list = sectionsForStage(sections, stage);
  if (list.length === 0) return "";
  const gaps = [...new Set(list.flatMap(missingSectionFields))];
  if (gaps.length > 0) {
    return `${stageLabel(stage)} has work sections missing ${gaps.join(", ")}.`;
  }
  if (sectionsProgress(list) !== 100) {
    return `Complete the work sections for ${stageLabel(stage)} before moving on.`;
  }
  return "";
};

/**
 * Overall project progress: each stage carries equal weight. Stages already
 * passed count in full; the current stage contributes its own progress.
 *
 * @returns {number|null} 0–100, or null when the stage is unrecognised.
 */
export function projectProgress(sections, currentStage, stages = RIBA_STAGES) {
  const idx = stages.indexOf(currentStage);
  if (idx < 0) return null;
  const perStage = 100 / stages.length;
  const passed = idx * perStage;
  const current = perStage * ((stageProgress(sections, currentStage) ?? 0) / 100);
  return Math.round(passed + current);
}

/**
 * Which stages the project may move to, and why not when it may not.
 *
 * Going back is always allowed. Going forward is one stage at a time, and only
 * once the project's own setup is complete and the current stage's sections are
 * filled in and finished.
 *
 * @param {object} project - needs work_sections, riba_stage and the project fields.
 * @returns {{stage: string, disabled: boolean, reason: string}[]}
 */
export function stageOptions(project, stages = RIBA_STAGES) {
  const sections = project?.work_sections;
  const currentStage = project?.riba_stage;
  const idx = stages.indexOf(currentStage);

  const projectGaps = missingProjectFields(project);
  const blockedReason = projectGaps.length > 0
    ? `Add the project's ${projectGaps.join(", ")} before moving stage.`
    : stageBlockReason(sections, currentStage);

  return stages.map((stage, i) => {
    if (idx < 0 || i <= idx) return { stage, disabled: false, reason: "" };
    if (i === idx + 1) {
      return blockedReason
        ? { stage, disabled: true, reason: blockedReason }
        : { stage, disabled: false, reason: "" };
    }
    return {
      stage,
      disabled: true,
      reason: `Stages advance one at a time — ${stageLabel(stages[idx + 1])} comes next.`,
    };
  });
}

/** Convenience: may the project move to `target` from where it is? */
export function canMoveToStage(project, target, stages = RIBA_STAGES) {
  const opt = stageOptions(project, stages).find((o) => o.stage === target);
  return !!opt && !opt.disabled;
}
