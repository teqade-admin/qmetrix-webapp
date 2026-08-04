/**
 * Step-level validation for the onboarding wizard.
 *
 * The wizard let you page straight through to the end without filling anything
 * in, so a half-finished record could be saved and only the checklist on the
 * Onboarding tab showed what was missing — after the fact.
 *
 * Every step is mandatory, but the wizard is navigable in any order: the steps
 * report what they are still missing, and Onboard is the single gate, staying
 * disabled until nothing is outstanding. What each step asks for is exactly
 * what the onboarding checklist counts as onboarded, so the two can no longer
 * disagree:
 *
 *   Role step      → role_assignment, system_role, cost_rate
 *   Contracts step → contract_upload
 *   Documents step → document_collection
 *
 * The Personal step has no checklist entry of its own; it collects the identity
 * the record cannot exist without.
 */

export const WIZARD_STEPS = ["personal", "role", "contracts", "documents"];

export const STEP_LABELS = {
  personal: "Personal",
  role: "Role",
  contracts: "Contracts",
  documents: "Documents",
};

const text = (v) => String(v ?? "").trim();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v));
/** A stored 0 is a real cost rate, so blankness is the test, not falsiness. */
const filled = (v) => v !== "" && v !== null && v !== undefined;

const STEP_RULES = {
  personal: [
    { label: "Full name", ok: (f) => !!text(f.full_name) },
    { label: "A valid email address", ok: (f) => isEmail(f.email) },
    { label: "Department", ok: (f) => !!f.department },
    { label: "Start date", ok: (f) => !!f.start_date },
  ],
  role: [
    { label: "Seniority (role)", ok: (f) => !!f.role },
    { label: "System role", ok: (f) => !!f.app_role },
    { label: "Cost rate", ok: (f) => filled(f.cost_rate) },
  ],
  contracts: [
    { label: "At least one contract uploaded", ok: (f) => (f.contracts || []).length > 0 },
  ],
  documents: [
    { label: "At least one document collected", ok: (f) => (f.documents || []).length > 0 },
  ],
};

/** What is still outstanding on a step, in the order the fields appear. */
export function missingForStep(step, form) {
  return (STEP_RULES[step] || []).filter((rule) => !rule.ok(form || {})).map((rule) => rule.label);
}

export const isStepComplete = (step, form) => missingForStep(step, form).length === 0;

/** Everything outstanding across the whole wizard. */
export const missingForOnboarding = (form) =>
  WIZARD_STEPS.flatMap((step) => missingForStep(step, form));

/** Whether the Onboard button may be pressed. */
export const canOnboard = (form) => missingForOnboarding(form).length === 0;

/** The step to land on when reopening a part-finished record. */
export const firstIncompleteStep = (form) =>
  WIZARD_STEPS.find((step) => !isStepComplete(step, form)) || WIZARD_STEPS[0];

export const nextStep = (step) => WIZARD_STEPS[WIZARD_STEPS.indexOf(step) + 1] || null;
export const prevStep = (step) => {
  const i = WIZARD_STEPS.indexOf(step);
  return i > 0 ? WIZARD_STEPS[i - 1] : null;
};

