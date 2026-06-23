import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { DocFidelityConfig } from "./config.js";

export interface BrokenReference {
  doc: string;
  reference: string;
}

export interface MissingSymbol {
  doc: string;
  symbol: string;
}

export interface DocFidelityResult {
  brokenReferences: BrokenReference[];
  missingSymbols: MissingSymbol[];
  summary: string;
}

const MARKDOWN_LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;
const BARE_PATH_RE = /(?<![[(])\b[\w.-]+\/[\w./-]*\b/g;
const PASCAL_CASE_SYMBOL_RE = /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*){1,}\b/g;

function isLikelyExternalOrAnchor(ref: string): boolean {
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("#")
  );
}

function extractReferences(content: string): string[] {
  const refs = new Set<string>();

  for (const match of content.matchAll(MARKDOWN_LINK_RE)) {
    const ref = match[1].split("#")[0].trim();
    if (ref && !isLikelyExternalOrAnchor(match[1])) {
      refs.add(ref);
    }
  }

  for (const match of content.matchAll(BARE_PATH_RE)) {
    const ref = match[0];
    if (!isLikelyExternalOrAnchor(ref)) {
      refs.add(ref);
    }
  }

  return [...refs];
}

function extractPascalCaseSymbols(content: string): string[] {
  const symbols = new Set<string>();
  for (const match of content.matchAll(PASCAL_CASE_SYMBOL_RE)) {
    symbols.add(match[0]);
  }
  return [...symbols];
}

export async function checkDocFidelity(
  repoRoot: string,
  config: DocFidelityConfig,
): Promise<DocFidelityResult> {
  const docFiles = await fg(config.docs, {
    cwd: repoRoot,
    ignore: config.ignore,
    absolute: true,
  });
  const codeFiles = await fg(config.code, {
    cwd: repoRoot,
    ignore: config.ignore,
    absolute: true,
  });

  const codeFilesSet = new Set(codeFiles.map((f) => path.resolve(f)));
  const existsCache = new Map<string, boolean>();

  async function pathExists(p: string): Promise<boolean> {
    if (existsCache.has(p)) return existsCache.get(p)!;
    let result: boolean;
    try {
      await readFile(p);
      result = true;
    } catch {
      result = codeFilesSet.has(path.resolve(p));
    }
    existsCache.set(p, result);
    return result;
  }

  const codeContents = await Promise.all(
    codeFiles.map((f) => readFile(f, "utf-8")),
  );
  const combinedCode = codeContents.join("\n");

  const brokenReferences: BrokenReference[] = [];
  const missingSymbols: MissingSymbol[] = [];

  for (const docFile of docFiles) {
    const content = await readFile(docFile, "utf-8");
    const docRel = path.relative(repoRoot, docFile);

    const references = extractReferences(content);
    for (const ref of references) {
      const resolved = path.resolve(path.dirname(docFile), ref);
      const fallbackResolved = path.resolve(repoRoot, ref);
      const exists =
        (await pathExists(resolved)) || (await pathExists(fallbackResolved));
      if (!exists) {
        brokenReferences.push({ doc: docRel, reference: ref });
      }
    }

    const symbols = extractPascalCaseSymbols(content);
    for (const symbol of symbols) {
      if (!combinedCode.includes(symbol)) {
        missingSymbols.push({ doc: docRel, symbol });
      }
    }
  }

  const summary = `Checked ${docFiles.length} doc file(s) against ${codeFiles.length} code file(s): ${brokenReferences.length} broken reference(s), ${missingSymbols.length} missing symbol(s).`;

  return { brokenReferences, missingSymbols, summary };
}
