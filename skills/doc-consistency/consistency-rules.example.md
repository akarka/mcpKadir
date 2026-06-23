# Consistency Rules — EXAMPLE / TEMPLATE

> **Agent-facing.** Copy this to your consuming repo as `docs/consistency-rules.md` and replace
> every placeholder with your project's real rules. The generic `doc-consistency` skill reads
> THIS file at runtime (its step 2) and applies whatever you write here. The skill supplies the
> *procedure*; this file supplies the *truth criteria*. Nothing here is hardcoded in mcpKadir.
>
> **This template is intentionally generic and fictional.** mcpKadir is a public repo — keep all
> real project internals (namespaces, paths, ADR ids, conventions) out of it. They belong only in
> your own (private) consumer repo's copy. Everything below is a neutral placeholder to show the
> *shape*; swap it for yours.

## 1. Doc ↔ code mapping

List which documentation artifacts must stay in agreement with which code, and how to resolve a
changed code path back to the doc that describes it.

| Artifact | Location (example) | Must agree with |
| --- | --- | --- |
| Feature guide | `docs/features/<id>.md` | the code that implements `<id>` |
| Spec | `docs/specs/<id>.md` | the guide's intent |
| Feature index row | `docs/features/index.md` | guide status / scope |
| Code | `src/**` | the guide's technical section |

> How to resolve code path → feature id: `<describe your lookup, e.g. via docs/features/index.md>`.

## 2. Technical-section symbol rule

If your guides have a section that names concrete types/methods, say so here and name the pattern
(e.g. "types under `<YourNamespace>.*`, command classes, `<YourInterface>`"). A symbol the
doc-fidelity tool flags as missing is **real drift** only if that named type/method was actually
renamed/removed. A concept name, a still-existing interface, or a comment-only mention is a
**false positive**.

## 3. Naming & i18n (only if you have translations)

- State your **canonical language** and the rule "never fix drift by overwriting canonical with a
  translation."
- State where translations live (e.g. `docs/<lang>/<id>.md`) and how staleness is detected
  (e.g. a `Version` field that must match the canonical doc). Flag mismatches as `STALE`.

## 4. Human-gated artifacts (never auto-fix)

List anything a change might imply that only a human may author — and say "stop and flag, don't
fabricate." Typical examples:

- **Decision records** — `<path to your ADR/decision log>`. If a change implies a decision with no
  record, flag `[GATED]`.
- **Mandates / invariants** — `<your non-negotiable rules, e.g. "no hardcoded user-facing strings",
  "module X must not depend on Y">`. A doc that promises something a mandate forbids is drift.

## 5. Tier / packaging (only if applicable)

If features map to tiers/editions/entitlements, state the rule (e.g. "code's required-entitlement
must equal the guide id; a guide's tier must match the packaging the config implies; a feature
still marked `Unassigned` while shipping is drift").

## 6. Drift vs false-positive guidance (how to rule)

When the doc-fidelity tool hands you a candidate:

- **Broken reference** → open the doc and the supposed target. Real drift if a path that existed
  was renamed/moved/deleted. False positive if it's an example string, a non-path token, or an
  anchor-only link.
- **Missing symbol** → read the code section 1 points you at. Real drift if the type/class was
  renamed or removed. False positive if it's an English word, a concept, a still-existing symbol
  under a different namespace, or appears only in comments/strings.

When in doubt, report it as a candidate with your reasoning rather than silently dropping it.
