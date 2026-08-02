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

/**
 * A stage blocks progress only if it has sections that aren't finished.
 * A stage with no sections is nothing to wait for, so it never blocks.
 */
export const isStageComplete = (sections, stage) => {
  const p = stageProgress(sections, stage);
  return p === null || p === 100;
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
 * Going back is always allowed; going forward is one stage at a time and only
 * once the current stage's sections are done.
 *
 * @returns {{stage: string, disabled: boolean, reason: string}[]}
 */
export function stageOptions(sections, currentStage, stages = RIBA_STAGES) {
  const idx = stages.indexOf(currentStage);
  const currentDone = isStageComplete(sections, currentStage);
  return stages.map((stage, i) => {
    if (idx < 0 || i <= idx) return { stage, disabled: false, reason: "" };
    if (i === idx + 1) {
      return currentDone
        ? { stage, disabled: false, reason: "" }
        : {
            stage,
            disabled: true,
            reason: `Complete the work sections for ${stageLabel(currentStage)} before moving on.`,
          };
    }
    return {
      stage,
      disabled: true,
      reason: `Stages advance one at a time — ${stageLabel(stages[idx + 1])} comes next.`,
    };
  });
}

/** Convenience: may the project move from its current stage to `target`? */
export function canMoveToStage(sections, currentStage, target, stages = RIBA_STAGES) {
  const opt = stageOptions(sections, currentStage, stages).find((o) => o.stage === target);
  return !!opt && !opt.disabled;
}
