#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { checkDocFidelity } from "./tool.js";

const server = new McpServer({
  name: "doc-fidelity",
  version: "0.0.1",
});

server.registerTool(
  "check_doc_fidelity",
  {
    title: "Check Doc Fidelity",
    description:
      "Checks a repository's documentation for broken file references and mentions of code symbols (types/classes) that no longer exist in the codebase.",
    inputSchema: {
      repoRoot: z
        .string()
        .describe("Absolute path to the root of the repository to check"),
      configPath: z
        .string()
        .optional()
        .describe(
          "Path to the doc-fidelity config file, relative to repoRoot (default: .mcp-doc-fidelity.json)",
        ),
    },
  },
  async ({ repoRoot, configPath }) => {
    const config = await loadConfig(repoRoot, configPath);
    const result = await checkDocFidelity(repoRoot, config);
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
