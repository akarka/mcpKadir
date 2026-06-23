---
name: doc-consistency
description: >-
  Verify a repo's documentation still tells the truth about its code after a change.
  Generic: knows nothing about a specific project. Gathers mechanical evidence via the
  doc-fidelity MCP tool (clerk), then applies THIS repo's own consistency rules to judge
  semantic drift (judge). Reads project-specific criteria from a rules file in the consuming
  repo — never hardcodes any one project's conventions. Invoke with `fix` to apply doc
  corrections after reporting.
---

# Documentation ⇄ Codebase Consistency (generic)

This skill is the **judge**. It does not restate project rules — it reads them at runtime from
the consuming repo and applies them. The mechanical layer (does a file exist, where does a
symbol appear) belongs to the `check_doc_fidelity` MCP tool; this skill adds the judgment a
deterministic check cannot make: **does the prose still describe the real code?**

## Precondition: this repo must declare its own rules

This skill is generic, so it has no built-in notion of what "consistent" means *here*. Before
judging, locate the consuming repo's specialization:

1. **`.mcp-doc-fidelity.json`** at repo root — the doc/code/ignore globs (drives the MCP tool).
2. **A project rules file** — default `docs/consistency-rules.md`. This is where the repo
   encodes its own truth criteria: which doc sections must match which code, naming/i18n
   conventions, any human-gated artifacts (ADRs/mandates), tier/entitlement rules, etc.

If neither exists, **stop and report** — do not invent criteria. Offer to scaffold them from
`consistency-rules.example.md` (next to this skill), which shows the expected shape.

## Arguments

- *(none)* / `check` — read-only. Report findings, change nothing. **Default.**
- `fix` — after reporting, apply documentation corrections only (never edits source code).

## Procedure

1. **Mechanical evidence first.** Call the `check_doc_fidelity` MCP tool with `repoRoot` set to
   the consuming repo. It returns candidate broken references and candidate missing symbols —
   **evidence, not verdicts.** Treat every item as "needs judgment," not "confirmed broken."

2. **Load this repo's rules.** Read `docs/consistency-rules.md` (or the path the repo
   specifies). These define what counts as drift here. Apply them; do not substitute your own.

3. **Judge each candidate.** For every item the tool surfaced:
   - **Broken reference** — is it a real path that vanished (rename/move/delete), or a
     false positive (an example string, a non-path token, an anchor)? Open the doc and the
     supposed target to decide.
   - **Missing symbol** — did the type/class get renamed or removed (real drift), or is the
     token an English word / a concept name / present only in a comment (false positive)?
     Read the actual code the rules point you at before ruling.
   - Apply any repo-specific rules from step 2 that the tool can't see (i18n lockstep,
     human-gated decisions, tier/entitlement, naming mandates).

4. **Report** using the format below. If `fix` was requested, continue to step 5; otherwise
   stop — `check` never edits.

5. **Fix mode only.** Apply **documentation** corrections per this repo's rules:
   - Update the doc section(s) to match the code.
   - Honor any versioning/i18n bookkeeping the rules require.
   - If a change implies an architectural decision the rules gate behind a human
     (ADR/mandate/etc.), **stop and flag it** — never fabricate that artifact.
   - Re-run `check_doc_fidelity`; confirm the evidence list is empty or fully explained.

## Output format

```
## Doc-Consistency Report  (mode: <check|fix>)

### Mechanical evidence (check_doc_fidelity)
Broken-reference candidates: N   Missing-symbol candidates: M

### Judgment
- [DRIFT]  <doc> · references `src/Old.cs` — file renamed to `src/New.cs`
- [DRIFT]  <doc> · names `OldType` — code renamed it to `NewType`
- [FALSE+] <doc> · `SomeWord` flagged as missing symbol — it's prose, not a type
- [GATED]  <doc/file> · change implies an architectural decision — needs human sign-off
            per <rule>

### Verdict
CLEAN  |  N real issues (P human-gated)   →  <"run with `fix`" if check-only and fixable>
```

## Guardrails

- **The tool reports candidates; you render verdicts.** Never pass an MCP finding straight
  through as truth — that's the substring trap this design exists to avoid.
- **Never edit source code.** This skill reconciles *docs* to code, never the reverse. If the
  *code* looks wrong, report it; don't change it.
- **Human-gated artifacts stay human.** Surface the obligation (ADR/mandate/etc.); don't
  fabricate one to make the report go green.
- **Rules file wins.** If this skill and the repo's `docs/consistency-rules.md` ever disagree,
  the repo's rules win — and that disagreement is itself a finding to report.
