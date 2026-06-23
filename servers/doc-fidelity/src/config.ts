import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const configSchema = z.object({
  docs: z.array(z.string()).min(1),
  code: z.array(z.string()).min(1),
  ignore: z.array(z.string()).default([]),
});

export type DocFidelityConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG_FILENAME = ".mcp-doc-fidelity.json";

export async function loadConfig(
  repoRoot: string,
  configPath?: string,
): Promise<DocFidelityConfig> {
  const resolvedPath = path.resolve(
    repoRoot,
    configPath ?? DEFAULT_CONFIG_FILENAME,
  );
  const raw = await readFile(resolvedPath, "utf-8");
  const parsed = JSON.parse(raw);
  return configSchema.parse(parsed);
}
