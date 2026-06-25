// Quick generic fixture test for check_i18n_fidelity.
// Asserts the clerk returns structured evidence for all three checks.
// Run after build: `npm run build` then `npm test` (or `node test/run.mjs`).
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../dist/config.js";
import { checkI18nFidelity } from "../dist/tool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "fixture");

const config = await loadConfig(repoRoot);
const result = await checkI18nFidelity(repoRoot, config);

// Shape: all three evidence arrays present + a summary string.
assert.ok(Array.isArray(result.hardcodedCandidates), "hardcodedCandidates is an array");
assert.ok(Array.isArray(result.parityGaps), "parityGaps is an array");
assert.ok(Array.isArray(result.orphanKeys), "orphanKeys is an array");
assert.equal(typeof result.summary, "string", "summary is a string");

// 1. Hardcoded candidate: the bare "Save changes" literal, not bound to any key.
//    `t("home.title")` is excluded because its value matches a canonical key.
assert.ok(
  result.hardcodedCandidates.some((c) => c.value === "Save changes"),
  "expected 'Save changes' among hardcoded candidates",
);
assert.ok(
  !result.hardcodedCandidates.some((c) => c.value === "home.title"),
  "key-lookup argument 'home.title' must NOT be a hardcoded candidate",
);
for (const c of result.hardcodedCandidates) {
  assert.ok(typeof c.file === "string" && c.line > 0, "candidate has file + line");
}

// 2. Parity gap: tr.json is missing home.subtitle and carries an extra legacy.removed.
const tr = result.parityGaps.find((g) => g.file.replace(/\\/g, "/").endsWith("i18n/tr.json"));
assert.ok(tr, "expected a parity gap entry for i18n/tr.json");
assert.ok(tr.missingKeys.includes("home.subtitle"), "tr.json missing home.subtitle");
assert.ok(tr.extraKeys.includes("legacy.removed"), "tr.json has extra legacy.removed");

// 3. Orphan key: home.subtitle is defined in canonical but referenced in 0 code files.
assert.ok(
  result.orphanKeys.some((o) => o.key === "home.subtitle"),
  "expected home.subtitle among orphan keys",
);
assert.ok(
  !result.orphanKeys.some((o) => o.key === "home.title"),
  "home.title is referenced in code and must NOT be orphan",
);

console.log("ok - i18n-fidelity evidence shape verified");
console.log(result.summary);
