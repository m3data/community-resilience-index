/**
 * TEST-035 — Purity boundary enforcement (SPEC-001 Section 8)
 *
 * Static analysis of the import graph to verify that:
 * 1. lib/scoring/ never imports from lib/data/, lib/signals/, or app/
 * 2. lib/scoring/ never uses I/O primitives (fs, fetch, process.env)
 * 3. lib/data/ never imports from app/api/
 * 4. lib/scoring/ functions accept data as parameters (no global reads)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCORING_DIR = resolve(__dirname, '..');
const LIB_DATA_DIR = resolve(__dirname, '..', '..', 'data');

/** Collect all .ts files from a directory (non-recursive). */
function tsFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

/** Extract import/require paths from source text. */
function extractImports(source: string): string[] {
  const paths: string[] = [];
  // import ... from '...'
  for (const m of source.matchAll(/(?:import|export)\s.*?from\s+['"]([^'"]+)['"]/g)) {
    paths.push(m[1]);
  }
  // import('...')
  for (const m of source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    paths.push(m[1]);
  }
  // require('...')
  for (const m of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    paths.push(m[1]);
  }
  return paths;
}

const scoringFiles = tsFiles(SCORING_DIR);
const dataFiles = tsFiles(LIB_DATA_DIR);

// ── 1. lib/scoring/ must not import from impure layers ──────────────────────

describe('TEST-035: Purity boundary — scoring imports', () => {
  const forbiddenPatterns = [
    /lib\/data/,
    /lib\/signals/,
    /\.\.\/data/,
    /\.\.\/signals/,
    /app\//,
    /src\/data/,
    /src\/api/,
  ];

  it.each(
    scoringFiles.map((f) => [f.split('/').pop()!, f] as const),
  )('%s does not import from impure layers', (_name, filePath) => {
    const source = readFileSync(filePath, 'utf-8');
    const imports = extractImports(source);
    const violations = imports.filter((imp) =>
      forbiddenPatterns.some((p) => p.test(imp)),
    );
    expect(violations).toEqual([]);
  });
});

// ── 2. lib/scoring/ must not use I/O primitives ─────────────────────────────

describe('TEST-035: Purity boundary — no I/O primitives in scoring', () => {
  const ioPatterns = [
    { pattern: /\bfs\b/, label: 'fs module' },
    { pattern: /\breadFileSync\b/, label: 'readFileSync' },
    { pattern: /\breadFile\b/, label: 'readFile' },
    { pattern: /\bwriteFileSync\b/, label: 'writeFileSync' },
    { pattern: /\bfetch\s*\(/, label: 'fetch()' },
    { pattern: /\bprocess\.env\b/, label: 'process.env' },
    { pattern: /\bconsole\.(log|warn|error)\b/, label: 'console output' },
    { pattern: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  ];

  // Only check non-test source files
  const sourceFiles = scoringFiles.filter(
    (f) => !f.endsWith('.test.ts') && !f.includes('__tests__'),
  );

  it.each(
    sourceFiles.map((f) => [f.split('/').pop()!, f] as const),
  )('%s contains no I/O primitives', (_name, filePath) => {
    const source = readFileSync(filePath, 'utf-8');
    // Strip comments to avoid false positives from documentation
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
    const violations = ioPatterns
      .filter((io) => io.pattern.test(stripped))
      .map((io) => io.label);
    expect(violations).toEqual([]);
  });
});

// ── 3. lib/data/ must not import from app/api/ ──────────────────────────────

describe('TEST-035: Purity boundary — data layer imports', () => {
  const apiForbidden = [/app\/api/, /src\/api/, /\.\.\/api/, /\.\.\/\.\.\/api/];

  it.each(
    dataFiles.map((f) => [f.split('/').pop()!, f] as const),
  )('%s does not import from app/api/', (_name, filePath) => {
    const source = readFileSync(filePath, 'utf-8');
    const imports = extractImports(source);
    const violations = imports.filter((imp) =>
      apiForbidden.some((p) => p.test(imp)),
    );
    expect(violations).toEqual([]);
  });
});

// ── 4. Scoring functions accept data as parameters (no global reads) ────────

describe('TEST-035: Purity boundary — no global state reads', () => {
  const globalPatterns = [
    /\bglobalThis\b/,
    /\bwindow\b/,
    /\bglobal\b/,
    /\bprocess\.env\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
  ];

  const sourceFiles = scoringFiles.filter(
    (f) => !f.endsWith('.test.ts') && !f.includes('__tests__'),
  );

  it.each(
    sourceFiles.map((f) => [f.split('/').pop()!, f] as const),
  )('%s reads no global state', (_name, filePath) => {
    const source = readFileSync(filePath, 'utf-8');
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
    const violations = globalPatterns
      .filter((p) => p.test(stripped))
      .map((p) => p.source);
    expect(violations).toEqual([]);
  });
});
