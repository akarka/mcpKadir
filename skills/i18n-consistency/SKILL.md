---
name: i18n-consistency
description: >-
  Judge whether a repo's localization is actually drifting after a change. Generic: knows
  nothing about a specific project. Gathers mechanical evidence via the i18n-fidelity MCP tool
  (clerk) — candidate hardcoded strings, language-file parity gaps, orphan keys — then applies
  THIS repo's own i18n rules to classify each candidate as real drift, false positive, or
  human/translator-gated. Reads project-specific criteria from a rules file in the consuming
  repo — never hardcodes any one project's conventions. Invoke with `fix` to apply the safe
  corrections it is allowed to make.
---

# Localization ⇄ Codebase Consistency (generic)

This skill is the **judge**. It does not restate project rules — it reads them at runtime from
the consuming repo and applies them. The mechanical layer (is this literal bound to a key, is
this key in every language file, is this key referenced anywhere) belongs to the
`check_i18n_fidelity` MCP tool; this skill adds the judgment a deterministic check cannot make:
**is this string actually user-facing, and is this gap actually a bug here?**

## Precondition: this repo must declare its own rules

This skill is generic, so it has no built-in notion of what "localized correctly" means *here*.
Before judging, locate the consuming repo's specialization:

1. **`.mcp-i18n-fidelity.json`** at repo root — the canonical/translations/code/ignore globs
   (drives the MCP tool).
2. **A project rules file** — default `docs/i18n-rules.md`. This is where the repo encodes its
   own truth criteria: which strings are user-facing vs constants that are never localized, the
   canonical language, where translations live, key-naming conventions, and any
   human/translator-gated artifacts.

If neither exists, **stop and report** — do not invent criteria. Offer to scaffold them from
`i18n-rules.example.md` (next to this skill), which shows the expected shape.

## Arguments

- *(none)* / `check` — read-only. Report findings, change nothing. **Default.**
- `fix` — after reporting, apply only the **safe** corrections this skill is allowed to make
  (see step 5). It never authors translations and never edits source logic.

## Procedure

1. **Mechanical evidence first.** Call the `check_i18n_fidelity` MCP tool with `repoRoot` set to
   the consuming repo. It returns `hardcodedCandidates`, `parityGaps`, and `orphanKeys` —
   **evidence, not verdicts.** Treat every item as "needs judgment," not "confirmed."

2. **Load this repo's rules.** Read `docs/i18n-rules.md` (or the path the repo specifies). These
   define what counts as drift here. Apply them; do not substitute your own.

3. **Judge each candidate.**
   - **Hardcoded candidate** — open the file/line. Is the literal a user-facing string that
     should come from a resource key (real **DRIFT**), or is it a constant the rules say is never
     localized — an enum value, log message, import path, test fixture, machine identifier
     (**FALSE+**)? The consumer's rules list these classes; apply them.
   - **Parity gap** — a `missingKey` in a translation file is **DRIFT** if the rules require
     lockstep with the canonical language; it is **GATED** if the rules say translations are
     authored by a human/translator (you may not invent the translated value). An `extraKey` is
     **DRIFT** (stale/leftover) unless the rules carve out per-language-only keys.
   - **Orphan key** — a canonical key referenced in 0 code files is **DRIFT** (dead key, safe to
     remove) only if the rules don't mark it as built dynamically or consumed outside the scanned
     `code` globs (e.g. server-rendered, config-driven) — otherwise **FALSE+**.

4. **Report** using the format below. If `fix` was requested, continue to step 5; otherwise stop
   — `check` never edits.

5. **Fix mode only.** Apply **only** corrections the rules permit without human/translator input:
   - Extract a confirmed-DRIFT hardcoded string into a new canonical key (per the repo's naming
     convention) and replace the literal with the lookup — then add the same key to every
     translation file **with the value flagged for translation**, never machine-translated.
   - Remove a confirmed-dead orphan key / stale `extraKey` if the rules allow it.
   - Authoring an actual translated value, or any change the rules gate behind a human, **stops
     and flags** — never fabricate a translation to make parity go green.
   - Re-run `check_i18n_fidelity`; confirm the evidence list is empty or fully explained.

## Output format

```
## i18n-Consistency Report  (mode: <check|fix>)

### Mechanical evidence (check_i18n_fidelity)
Hardcoded candidates: H   Parity gaps: P   Orphan keys: O

### Judgment
- [DRIFT]  src/Home.tsx:12 · "Welcome back" — user-facing, not bound to a key
- [FALSE+] src/log.ts:8 · "db connection failed" — log message, rules say never localized
- [DRIFT]  i18n/tr.json · missing `home.subtitle` — lockstep required
- [GATED]  i18n/tr.json · missing `orders.empty` — translator must author the value
- [DRIFT]  i18n/en.json · `legacy.removed` orphan — dead key, no code reference

### Verdict
CLEAN  |  N real issues (G human/translator-gated)  →  <"run with `fix`" if check-only and fixable>
```

## Guardrails

- **The tool reports candidates; you render verdicts.** Never pass an MCP finding straight
  through as truth — that's the noise this design exists to filter.
- **Never machine-translate.** Adding a key skeleton is fine; inventing the translated *value*
  is translator work — flag it, don't fabricate it.
- **Never edit source logic.** This skill reconciles strings/keys, not behavior. If the *code*
  looks wrong, report it; don't change it.
- **Rules file wins.** If this skill and the repo's `docs/i18n-rules.md` ever disagree, the
  repo's rules win — and that disagreement is itself a finding to report.
