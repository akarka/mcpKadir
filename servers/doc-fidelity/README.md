# doc-fidelity

MCP server, one tool: `check_doc_fidelity`. Detects documentation that has drifted from
the code it describes.

## When to use this tool

Use `check_doc_fidelity` when:
- Asked to verify docs are accurate / up to date with code.
- About to make claims about a repo's architecture docs and want to confirm they're not stale first.
- After a refactor, to check whether docs reference symbols that no longer exist.

Do not use it for: prose quality, doc completeness, or anything not covered by the two
checks below — it is intentionally narrow.

## Checks performed

1. **Broken references** — markdown links and bare path-like tokens in doc files,
   resolved against the repo filesystem. Anything that doesn't resolve is reported.
2. **Missing symbols** — PascalCase tokens in doc files (heuristic match for type/class
   names, e.g. `IBatchEngine`) that don't appear anywhere in the configured code files.
   Reported as likely renamed/removed.

Both checks are string-based, not AST-based. Treat results as candidates to verify, not
ground truth — false positives are possible (e.g. a symbol name that's also an English
word, or a path-like string that isn't actually a path).

## Precondition: config file in the target repo

This server has no built-in knowledge of any repo's layout. Before calling the tool,
confirm a config file exists at the target repo root (default name
`.mcp-doc-fidelity.json`; pass `configPath` to override). If it's missing, create one
before invoking the tool — guessing globs without it will fail validation.

Schema:

```json
{
  "docs": ["DOCS/Architecture/**/*.md", "DOCS/Features/**/*.md"],
  "code": ["**/*.cs"],
  "ignore": ["**/superseded/**", "external/**"]
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `docs` | `string[]` | yes | Globs, relative to repo root, for files to scan for references/symbols. |
| `code` | `string[]` | yes | Globs, relative to repo root, that define what counts as "existing code." |
| `ignore` | `string[]` | no | Globs excluded from both `docs` and `code`. Defaults to `[]`. |

## Registering the server

```json
{
  "mcpServers": {
    "doc-fidelity": {
      "command": "node",
      "args": ["<path-to-mcpKadir>/servers/doc-fidelity/dist/index.js"]
    }
  }
}
```

Build first if `dist/` doesn't exist: `npm install && npm run build` from the `mcpKadir` root.

## Tool contract: `check_doc_fidelity`

**Input**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `repoRoot` | `string` | yes | Absolute path to the repo root. |
| `configPath` | `string` | no | Path to config, relative to `repoRoot`. Default `.mcp-doc-fidelity.json`. |

**Output**

```json
{
  "brokenReferences": [
    { "doc": "DOCS/Architecture/overview.md", "reference": "src/DoesNotExist.cs" }
  ],
  "missingSymbols": [
    { "doc": "DOCS/Architecture/overview.md", "symbol": "RenamedTypeNoLongerHere" }
  ],
  "summary": "Checked 1 doc file(s) against 12 code file(s): 1 broken reference(s), 1 missing symbol(s)."
}
```

Empty arrays mean no findings — read `summary` first to decide whether to inspect the
arrays at all.

## Failure modes to expect

- Throws if `configPath` doesn't resolve to a readable JSON file, or the JSON fails the
  schema above (missing `docs`/`code`, wrong types) — surface this to the user rather
  than retrying with guessed globs.
- Empty `docs`/`code` glob matches produce a valid-but-trivial result (`summary` will say
  "Checked 0 doc file(s)...") — treat that as a sign the globs are wrong, not as "no
  findings."

## Known limitations

- `missingSymbols` is a plain substring check against concatenated code file contents —
  a symbol that coincidentally appears inside a comment, string literal, or as a substring
  of another identifier will suppress a true positive.
- Reference resolution tries path-relative-to-doc then path-relative-to-repo-root; it does
  not understand language-specific import/using resolution rules.
