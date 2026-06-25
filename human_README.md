# mcpKadir

This is my personal collection of [Model Context Protocol](https://modelcontextprotocol.io)
servers. The idea: instead of rebuilding the same kind of tool in every project, I build it
once here and pull it into whatever repo needs it as a git submodule.

Each tool lives in its own folder under `servers/` with its own `package.json`, builds
independently, and talks to whatever's consuming it over stdio. That last part matters —
it means a server here doesn't need to share a language or stack with the repo using it.
It's just another process that an MCP-aware client (Claude Code, etc.) spawns and talks to.

## Layout

```
mcpKadir/
├── package.json            # npm workspaces root
├── tsconfig.base.json      # shared TS compiler options
├── servers/                # MCP tools (the "clerks" — deterministic, return evidence)
│   └── <tool-name>/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       └── README.md       # spec for this tool, written for the agent that drives it
└── skills/                 # generic skill templates (the "judges" — the agent reasons)
    └── <skill-name>/
        └── SKILL.md        # procedure with a project-rules "hole" the consumer fills
```

**Servers vs skills:** a server is code the model *calls* (deterministic, runs as a process,
returns data). A skill is instructions the model *follows* (judgment, runs as the model's own
reasoning). Servers gather mechanical evidence; skills weigh it. See
[human_WORKFLOW.md](human_WORKFLOW.md) for how a consuming repo wires both in — and how you
edit this repo from inside another project.

## Docs naming convention

Two audiences, two prefixes:

- **`human_*.md`** — written for a person (this file, [human_WORKFLOW.md](human_WORKFLOW.md)).
- **Everything else** — written for an **agent** to act on: per-tool `README.md`, `SKILL.md`,
  `*.example.md` rule templates, `CLAUDE.md`. Terse, structured, no narrative fluff.

The full rule (so future agents follow it when adding docs) lives in [CLAUDE.md](CLAUDE.md).

## What's in here

| Server | What it does |
| --- | --- |
| [doc-fidelity](servers/doc-fidelity/README.md) | Flags docs that drifted from the code — broken file links, type names that got renamed or deleted. |
| [i18n-fidelity](servers/i18n-fidelity/README.md) | Flags localization drift — hardcoded user-facing strings, keys missing across language files, and keys nothing in code references. |

| Skill | What it does |
| --- | --- |
| [doc-consistency](skills/doc-consistency/SKILL.md) | Generic judge: takes doc-fidelity's evidence + the consuming repo's own rules and rules on real vs false-positive drift. |
| [i18n-consistency](skills/i18n-consistency/SKILL.md) | Generic judge: takes i18n-fidelity's evidence + the consuming repo's own i18n rules and classifies each candidate as drift, false positive, or translator-gated. |

## Getting set up

```bash
npm install   # installs deps for every workspace at once
npm run build # builds whichever workspaces have a build script
```

## Pulling a server into another project

Add this repo as a submodule, build it, then point your MCP client config at the built
entrypoint:

```bash
git submodule add <repo-url> mcp/mcpKadir
cd mcp/mcpKadir && npm install && npm run build
```

```json
{
  "mcpServers": {
    "doc-fidelity": {
      "command": "node",
      "args": ["mcp/mcpKadir/servers/doc-fidelity/dist/index.js"]
    }
  }
}
```

Most servers expect a small config file in the *consuming* repo so they know where to
look — check that server's own README for the details.

## Adding a new server

1. New folder under `servers/<name>/`, its own `package.json` extending
   `tsconfig.base.json`, and a `src/index.ts` that boots an MCP server over
   `StdioServerTransport`.
2. `npm install` at the root — npm workspaces picks it up automatically.
3. Add it to the table above, and write its README the way the others are written: as a
   spec an agent can act on, not as prose for a person.
