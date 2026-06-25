#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { checkI18nFidelity } from "./tool.js";

const server = new McpServer({
  name: "i18n-fidelity",
  version: "0.0.1",
});

server.registerTool(
  "check_i18n_fidelity",
  {
    title: "Check i18n Fidelity",
    description:
      "Emits evidence about a repository's localization: candidate hardcoded user-facing string literals in code (not bound to any resource key), key-parity gaps between the canonical language file and other language files, and canonical keys referenced in zero source files (orphans). Returns evidence only — no verdicts.",
    inputSchema: {
      repoRoot: z
        .string()
        .describe("Absolute path to the root of the repository to check"),
      configPath: z
        .string()
        .optional()
        .describe(
          "Path to the i18n-fidelity config file, relative to repoRoot (default: .mcp-i18n-fidelity.json)",
        ),
    },
  },
  async ({ repoRoot, configPath }) => {
    const config = await loadConfig(repoRoot, configPath);
    const result = await checkI18nFidelity(repoRoot, config);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
