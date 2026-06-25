# i18n-fidelity

MCP server, one tool: `check_i18n_fidelity`. Surfaces evidence that a repo's localization has
drifted — hardcoded user-facing strings, language-file parity gaps, and unreferenced keys.

This server is a **clerk**: it returns evidence, never a verdict. It does not decide whether a
string is "really" user-facing or whether a missing key is a bug — it reports the fact (this
literal isn't bound to a key; this key is absent from that language file; this key appears in 0
code files) and leaves the ruling to the paired `i18n-consistency` skill.

## When to use this tool

Use `check_i18n_fidelity` when:
- Asked whether the UI is fully localized / free of hardcoded strings.
- After adding a feature, to check the new keys landed in every language file.
- After deleting UI, to find now-orphaned translation keys.

Do not use it for: translation *quality*, grammar, or pluralization correctness — it is
intentionally narrow and string-based.

## Checks performed

1. **Hardcoded candidates** — quoted string literals in the configured code files that contain a
   letter, meet `minStringLength`, and do **not** exactly match a known canonical key. Reported
   with file + line. A `t("home.title")` argument is *excluded* because its value matches a key;
   a bare `"Welcome back"` is reported.
2. **Parity gaps** — for each non-canonical language file: canonical keys absent from it
   (`missingKeys`) and keys it carries that canonical lacks (`extraKeys`).
3. **Orphan keys** — canonical keys whose exact string appears in **0** code files (substring
   match against concatenated code).

All three checks are string-based, not AST-based. Treat every item as a **candidate to verify**,
not ground truth — false positives are expected (a constant that is legitimately never localized,
a key built dynamically by concatenation, etc.). The `i18n-consistency` skill rules on them.

## Precondition: config file in the target repo

This server has no built-in knowledge of any repo's layout. Before calling the tool, confirm a
config file exists at the target repo root (default name `.mcp-i18n-fidelity.json`; pass
`configPath` to override). If it's missing, create one before invoking the tool — guessing globs
without it will fail validation.

Schema:

```json
{
  "canonical": ["i18n/en/**/*.json"],
  "translations": ["i18n/**/*.json"],
  "code": ["src/**/*.{ts,tsx,js,jsx}"],
  "ignore": ["**/node_modules/**"],
  "minStringLength": 2
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `canonical` | `string[]` | yes | Globs for the canonical-language resource files — the source-of-truth key set. |
| `translations` | `string[]` | yes | Globs for the other-language resource files. Files that also match `canonical` are subtracted out, so a broad glob is safe. |
| `code` | `string[]` | yes | Globs for source files to scan for literals and key references. |
| `ignore` | `string[]` | no | Globs excluded from all of the above. Defaults to `[]`. |
| `minStringLength` | `number` | no | Minimum literal length to report as a hardcoded candidate. Defaults to `2`. |

Resource files are **JSON only** (v1). Nested objects are flattened to dotted keys
(`{ "home": { "title": "Hi" } }` → `home.title`).

## Registering the server

```json
{
  "mcpServers": {
    "i18n-fidelity": {
      "command": "node",
      "args": ["<path-to-mcpKadir>/servers/i18n-fidelity/dist/index.js"]
    }
  }
}
```

Build first if `dist/` doesn't exist: `npm install && npm run build` from the `mcpKadir` root.

## Tool contract: `check_i18n_fidelity`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repoRoot` | `string` | yes | Absolute path to the repo root. |
| `configPath` | `string` | no | Path to config, relative to `repoRoot`. Default `.mcp-i18n-fidelity.json`. |

**Output**

```json
{
  "hardcodedCandidates": [
    { "file": "src/Home.tsx", "line": 12, "value": "Welcome back" }
  ],
  "parityGaps": [
    { "file": "i18n/tr/common.json", "missingKeys": ["home.title"], "extraKeys": ["legacy.x"] }
  ],
  "orphanKeys": [
    { "key": "home.subtitle", "definedIn": "i18n/en/common.json" }
  ],
  "summary": "Scanned 3 code file(s); 12 canonical key(s) in 1 file(s); 1 translation file(s): 1 hardcoded candidate(s), 1 parity gap(s), 1 orphan key(s)."
}
```

Empty arrays mean no findings — read `summary` first to decide whether to inspect the arrays.

## Failure modes to expect

- Throws if `configPath` doesn't resolve to a readable JSON file, or the JSON fails the schema
  above (missing `canonical`/`translations`/`code`, wrong types) — surface this rather than
  retrying with guessed globs.
- Throws if a matched resource file isn't valid JSON — the offending file path is in the error.
- Empty `canonical`/`code` glob matches produce a valid-but-trivial result (`summary` will say
  "0 canonical key(s)" / "0 code file(s)") — treat that as a sign the globs are wrong, not as
  "no findings."

## Known limitations

- `hardcodedCandidates` flags **every** qualifying literal, including non-user-facing constants,
  log messages, import paths, and enum values. That noise is intentional: the clerk reports, the
  `i18n-consistency` skill (reading the consumer's rules for "what is user-facing") filters.
- `orphanKeys` is a plain substring check against concatenated code — a key assembled at runtime
  (`"home." + section`) will look orphaned, and a key string that also appears in an unrelated
  comment will be suppressed as a false negative.
- Literal extraction is line-based regex; a string literal spanning multiple lines, or a template
  literal with interpolation, may be reported partially or by its first line only.
- JSON resources only. YAML / `.properties` / gettext `.po` are not parsed in v1.
