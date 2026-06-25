# i18n Rules — EXAMPLE / TEMPLATE

> **Agent-facing.** Copy this to your consuming repo as `docs/i18n-rules.md` and replace every
> placeholder with your project's real rules. The generic `i18n-consistency` skill reads THIS
> file at runtime (its step 2) and applies whatever you write here. The skill supplies the
> *procedure*; this file supplies the *truth criteria*. Nothing here is hardcoded in mcpKadir.
>
> **This template is intentionally generic and fictional.** mcpKadir is a public repo — keep all
> real project internals (namespaces, paths, language codes, key prefixes) out of it. They belong
> only in your own (private) consumer repo's copy. Everything below is a neutral placeholder to
> show the *shape*; swap it for yours.

## 1. Canonical language & where translations live

- **Canonical language:** `<e.g. en>` — the source of truth for keys and copy.
- **Translation files:** `<e.g. i18n/<lang>.json>`. List every expected language: `<en, tr, de>`.
- **Lockstep rule:** state whether every canonical key MUST exist in every translation file. If
  yes, a `missingKey` from the i18n-fidelity tool is **DRIFT**; if your project ships partial
  translations on purpose, say so and name the exception.
- **Never fix drift by overwriting canonical with a translation, or by machine-translating.**

## 2. What is user-facing (vs never localized)

The tool flags *every* qualifying string literal as a hardcoded candidate. Tell the skill how to
separate real drift from noise. List the classes that are **never localized** (→ `FALSE+`):

- Log / telemetry messages (e.g. anything passed to `<your logger>`).
- Enum values, machine identifiers, API field names, config keys.
- Import paths, URLs, regex, test fixtures.
- `<any other class specific to your repo>`

Everything else that renders to an end user is **user-facing** → a hardcoded literal is **DRIFT**.
If you have a marker convention (e.g. only strings inside `t(...)` are localized, everything in
`*.view.tsx` is user-facing), state it here.

## 3. Key naming & structure

State your key convention so `fix` mode creates new keys correctly: `<e.g. dotted, feature-first:
feature.section.label; no dynamic concatenation>`. If keys are ever assembled at runtime
(`"home." + section`), say so — those look like **orphans** to the tool but are **FALSE+**.

## 4. Orphan-key policy

A canonical key referenced in 0 scanned code files is reported as an orphan. State which of these
apply, so the skill can tell a dead key from a live one:

- Keys consumed **outside** the scanned `code` globs (server-rendered, emails, config-driven) —
  **FALSE+**, and extend the `code` globs if practical.
- Keys built dynamically — **FALSE+**.
- Genuinely dead keys — **DRIFT**, safe to remove (state who may remove them).

## 5. Human / translator-gated artifacts (never auto-fix)

List anything only a human may author — and say "stop and flag, don't fabricate":

- **Translated values** — adding a key skeleton is fine; the actual translated copy is authored by
  `<your translator/process>`. The skill flags `[GATED]`, never machine-translates.
- **Copy changes to the canonical language** — if product/legal owns user-facing wording, a change
  implies sign-off; flag it.
- **`<any decision record / mandate your repo gates behind a human>`.**

## 6. Drift vs false-positive guidance (how to rule)

When the i18n-fidelity tool hands you a candidate:

- **Hardcoded candidate** → open the file/line. DRIFT if it's user-facing copy not bound to a key;
  FALSE+ if it's one of the never-localized classes in §2.
- **Parity gap** → DRIFT if §1 requires lockstep; GATED if the value must be authored by a
  translator; an `extraKey` is DRIFT (stale) unless §1 allows per-language-only keys.
- **Orphan key** → DRIFT if dead per §4; FALSE+ if consumed outside scanned code or built
  dynamically.

When in doubt, report it as a candidate with your reasoning rather than silently dropping it.
