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
└── servers/
    └── <tool-name>/
        ├── package.json
        ├── tsconfig.json
        ├── src/
        └── README.md       # spec for this tool, written for the agent that drives it
```

## What's in here

| Server | What it does |
| --- | --- |
| [doc-fidelity](servers/doc-fidelity/README.md) | Flags docs that drifted from the code — broken file links, type names that got renamed or deleted. |

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
