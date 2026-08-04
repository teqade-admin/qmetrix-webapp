/**
 * Project codes: a three-letter prefix from the project name plus a sequence,
 * e.g. Emaar Tower → EMR-001, Aldar Bridge → ALD-001.
 *
 * The prefix keeps the first letter then picks up consonants, which is how
 * people abbreviate a name out loud ("Emaar" → EMR rather than EMA). Vowels are
 * only used to pad a name too short to give three consonants.
 *
 * The sequence runs per prefix, so two unrelated projects never collide and a
 * code stays readable on its own.
 */

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** "Emaar Tower" → "EMR". Falls back to padding when a name is very short. */
export function codePrefix(name) {
  const letters = String(name || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters) return "PRJ";

  const picked = [letters[0]];
  for (const ch of letters.slice(1)) {
    if (picked.length === 3) break;
    if (!VOWELS.has(ch)) picked.push(ch);
  }
  // Not enough consonants (e.g. "Ai") — fall back to the remaining letters.
  for (const ch of letters.slice(1)) {
    if (picked.length === 3) break;
    if (!picked.includes(ch) || letters.length <= 3) picked.push(ch);
  }
  while (picked.length < 3) picked.push("X");
  return picked.slice(0, 3).join("");
}

export const formatProjectCode = (prefix, sequence) =>
  `${prefix}-${String(sequence).padStart(3, "0")}`;

const CODE_PATTERN = /^([A-Z]{3})-(\d{3,})$/;

export function parseProjectCode(code) {
  const m = String(code || "").trim().toUpperCase().match(CODE_PATTERN);
  return m ? { prefix: m[1], sequence: Number(m[2]) } : null;
}

/**
 * The next unused code for a project name.
 *
 * @param {string} name
 * @param {{project_code?: string}[]} projects - existing projects.
 */
export function nextProjectCode(name, projects = []) {
  const prefix = codePrefix(name);
  const list = Array.isArray(projects) ? projects : [];
  const taken = new Set(
    list.map((p) => String(p?.project_code || "").trim().toUpperCase()).filter(Boolean)
  );

  const highest = list.reduce((max, p) => {
    const parsed = parseProjectCode(p?.project_code);
    return parsed && parsed.prefix === prefix ? Math.max(max, parsed.sequence) : max;
  }, 0);

  let sequence = highest + 1;
  while (taken.has(formatProjectCode(prefix, sequence))) sequence++;
  return formatProjectCode(prefix, sequence);
}
