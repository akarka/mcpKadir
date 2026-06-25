import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { I18nFidelityConfig } from "./config.js";

export interface HardcodedCandidate {
  file: string;
  line: number;
  value: string;
}

export interface ParityGap {
  file: string;
  missingKeys: string[];
  extraKeys: string[];
}

export interface OrphanKey {
  key: string;
  definedIn: string;
}

export interface I18nFidelityResult {
  hardcodedCandidates: HardcodedCandidate[];
  parityGaps: ParityGap[];
  orphanKeys: OrphanKey[];
  summary: string;
}

// Quoted string literal: single, double, or backtick, with escapes honored.
const STRING_LITERAL_RE = /(['"`])((?:\\.|(?!\1).)*)\1/g;
const HAS_LETTER_RE = /[A-Za-z]/;

/**
 * Flatten a parsed JSON resource object into dotted keys.
 * `{ home: { title: "Hi" } }` -> `["home.title"]`. Arrays are flattened by index.
 */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }
  const keys: string[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") {
      keys.push(...flattenKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

async function readResourceKeys(file: string): Promise<string[]> {
  const raw = await readFile(file, "utf-8");
  const parsed = JSON.parse(raw);
  return flattenKeys(parsed);
}

function extractStringLiterals(
  content: string,
): { line: number; value: string }[] {
  const found: { line: number; value: string }[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((lineText, idx) => {
    for (const match of lineText.matchAll(STRING_LITERAL_RE)) {
      found.push({ line: idx + 1, value: match[2] });
    }
  });
  return found;
}

export async function checkI18nFidelity(
  repoRoot: string,
  config: I18nFidelityConfig,
): Promise<I18nFidelityResult> {
  const canonicalFiles = await fg(config.canonical, {
    cwd: repoRoot,
    ignore: config.ignore,
    absolute: true,
  });
  const translationFilesRaw = await fg(config.translations, {
    cwd: repoRoot,
    ignore: config.ignore,
    absolute: true,
  });
  const codeFiles = await fg(config.code, {
    cwd: repoRoot,
    ignore: config.ignore,
    absolute: true,
  });

  // Subtract canonical files out of the translation set, so a broad translations
  // glob that also matches the canonical files does not compare them to themselves.
  const canonicalSet = new Set(canonicalFiles.map((f) => path.resolve(f)));
  const translationFiles = translationFilesRaw.filter(
    (f) => !canonicalSet.has(path.resolve(f)),
  );

  // --- Canonical key set (source of truth) ---
  const canonicalKeyToFile = new Map<string, string>();
  for (const file of canonicalFiles) {
    const rel = path.relative(repoRoot, file);
    for (const key of await readResourceKeys(file)) {
      if (!canonicalKeyToFile.has(key)) {
        canonicalKeyToFile.set(key, rel);
      }
    }
  }
  const canonicalKeys = new Set(canonicalKeyToFile.keys());

  // --- Code contents (for orphan detection + literal extraction) ---
  const codeContents = await Promise.all(
    codeFiles.map(async (f) => ({
      rel: path.relative(repoRoot, f),
      text: await readFile(f, "utf-8"),
    })),
  );
  const combinedCode = codeContents.map((c) => c.text).join("\n");

  // --- 1. Hardcoded candidates ---
  const hardcodedCandidates: HardcodedCandidate[] = [];
  for (const { rel, text } of codeContents) {
    for (const { line, value } of extractStringLiterals(text)) {
      if (value.length < config.minStringLength) continue;
      if (!HAS_LETTER_RE.test(value)) continue;
      if (canonicalKeys.has(value)) continue; // it's a key lookup, not a hardcoded string
      hardcodedCandidates.push({ file: rel, line, value });
    }
  }

  // --- 2. Parity gaps (per translation file vs canonical) ---
  const parityGaps: ParityGap[] = [];
  for (const file of translationFiles) {
    const rel = path.relative(repoRoot, file);
    const keys = new Set(await readResourceKeys(file));
    const missingKeys = [...canonicalKeys].filter((k) => !keys.has(k));
    const extraKeys = [...keys].filter((k) => !canonicalKeys.has(k));
    if (missingKeys.length > 0 || extraKeys.length > 0) {
      parityGaps.push({ file: rel, missingKeys, extraKeys });
    }
  }

  // --- 3. Orphan keys (canonical key referenced in 0 code files) ---
  const orphanKeys: OrphanKey[] = [];
  for (const [key, definedIn] of canonicalKeyToFile) {
    if (!combinedCode.includes(key)) {
      orphanKeys.push({ key, definedIn });
    }
  }

  const summary =
    `Scanned ${codeFiles.length} code file(s); ${canonicalKeys.size} canonical key(s) in ` +
    `${canonicalFiles.length} file(s); ${translationFiles.length} translation file(s): ` +
    `${hardcodedCandidates.length} hardcoded candidate(s), ${parityGaps.length} parity gap(s), ` +
    `${orphanKeys.length} orphan key(s).`;

  return { hardcodedCandidates, parityGaps, orphanKeys, summary };
}
