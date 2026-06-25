import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const configSchema = z.object({
  canonical: z.array(z.string()).min(1),
  translations: z.array(z.string()).min(1),
  code: z.array(z.string()).min(1),
  ignore: z.array(z.string()).default([]),
  minStringLength: z.number().int().positive().default(2),
});

export type I18nFidelityConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG_FILENAME = ".mcp-i18n-fidelity.json";

export async function loadConfig(
  repoRoot: string,
  configPath?: string,
): Promise<I18nFidelityConfig> {
  const resolvedPath = path.resolve(
    repoRoot,
    configPath ?? DEFAULT_CONFIG_FILENAME,
  );
  const raw = await readFile(resolvedPath, "utf-8");
  const parsed = JSON.parse(raw);
  return configSchema.parse(parsed);
}
