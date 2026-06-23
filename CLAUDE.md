# Repo conventions (agent-facing)

This file is loaded into context automatically. Follow it when working in this repo.

## This is a PUBLIC repo — zero project-specific info

mcpKadir is published publicly. Nothing in it may reference any private/consuming project's
internals: no real namespaces, type names, file paths, ADR ids, conventions, repo names, or
config values. All of that lives only in the (private) consumer repo's own files
(`docs/consistency-rules.md`, `.mcp.json`, `.mcp-doc-fidelity.json`, etc.).

- Examples in docs/tests must be **generic and fictional** (e.g. `IUserRepository`,
  `OrderService`, `docs/features/<id>.md`) — never lifted from a real project.
- Tools take project locations as **runtime input** (e.g. `repoRoot`, `repoPaths`); they must
  not hardcode or persist any specific repo's data.
- Before committing, a quick scan for leaked project terms is worth it.

## Docs are split by audience

Every markdown file in this repo targets exactly one reader. The filename declares which:

- **`human_*.md`** → written for a **person**. Narrative, onboarding tone, explains *why*.
  Currently: `human_README.md`, `human_WORKFLOW.md`.
- **Everything else (unprefixed)** → written for an **agent** to act on. Terse, structured,
  imperative; tables and contracts over prose; state preconditions, inputs/outputs, failure
  modes and guardrails explicitly. Includes: per-tool `README.md`, `SKILL.md`,
  `*.example.md` rule templates, and this `CLAUDE.md`.

**When you add or edit a doc:**
- If it's for a human, name it `human_<name>.md`.
- Otherwise write it agent-first (no fluff) and leave it unprefixed.
- Don't mix the two in one file. If a doc serves both, split it.

> Note: renaming the root README to `human_README.md` means GitHub won't auto-render a
> landing page. That's an accepted trade for the convention; add a thin `README.md` stub
> pointing at `human_README.md` only if a rendered landing page is wanted.

## Architecture invariant: clerk vs judge

- **Servers (`servers/*`)** are *clerks*: deterministic code, return **evidence**, never
  verdicts. Don't bake judgment ("missing", "broken") into a tool's output — surface the
  fact ("symbol appears in 0 code files") and let the agent rule.
- **Skills (`skills/*`)** are *judges*: generic procedures the agent follows. They read the
  consuming repo's own rules file at runtime and apply it — they never hardcode one
  project's conventions. Project-specific customization lives in the **consumer**, not here.
