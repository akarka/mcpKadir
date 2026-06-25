# Roadmap (agent-facing)

Backlog of tools/skills to add. Each follows the established shape: a **clerk** (server that
emits evidence only) optionally paired with a **judge** (skill that reads the consuming repo's
own rules at runtime). Nothing project-specific ever lands here. Build the reference pair first
(`doc-fidelity` + `doc-consistency`, then `i18n-fidelity` + `i18n-consistency`) before mirroring.

## Shipped

- **doc-fidelity** (clerk) + **doc-consistency** (judge) — doc ⇄ code drift.
- **i18n-fidelity** (clerk) + **i18n-consistency** (judge) — localization drift.

## Backlog (not started)

| Idea | Kind | Sketch |
| --- | --- | --- |
| context-pack / repo-digest | clerk | Return a compact who-calls-what digest of a target repo to shrink the agent's context before a task. Evidence: symbol → callers/callees, file fan-in/out. No verdict. |
| delegate | skill | Package minimal context (digest + scoped task) and hand a well-scoped sub-task to a cheaper sub-model. Judge: decides what context is sufficient. |
| mandate-guard | clerk | Grep code for patterns a consumer's rules forbid or require (e.g. "no hardcoded secrets", "module X must not import Y"). Emit match locations; the consumer's rules file says which patterns matter. |
| submodule-inventory | clerk | Read each consuming repo's `.mcp.json` + rules files and report "who uses which mcpKadir server/version" — the data-not-branches inventory `human_WORKFLOW.md` argues for. |
| orphan-doc finder | clerk | Surface doc files that nothing links to and code areas with no doc coverage. Evidence only. |
| diff-hygiene pre-commit | clerk | On a staged diff, emit hygiene evidence (debug prints, TODOs, oversized files, leaked project terms) for a judge skill to rule on. |

## Conventions reminder

- Clerk emits **evidence**, never a verdict (no "missing"/"broken"/"drift" baked into output).
- Judge skill reads the **consumer's** rules file at runtime; ships an `*.example.md` template.
- Examples stay generic/fictional; tools take repo locations as runtime input, persist nothing.
