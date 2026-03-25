/**
 * Diversity index functions — SPEC-001 ADR-003
 *
 * Pure functions for measuring concentration and diversity
 * across categorical distributions.
 */

/**
 * Herfindahl-Hirschman Index (HHI).
 *
 * Returns a value in [0, 1] where 1 = maximum concentration
 * (all counts in a single category) and 1/n = perfectly even
 * distribution across n categories.
 *
 * Returns 0 for empty input.
 */
export function computeHerfindahl(counts: Record<string, number>): number {
  const values = Object.values(counts);
  const total = values.reduce((sum, v) => sum + v, 0);

  if (total === 0) return 0;

  let hhi = 0;
  for (const v of values) {
    const share = v / total;
    hhi += share * share;
  }

  return Math.round(hhi * 1_000_000) / 1_000_000;
}

/**
 * Shannon Diversity Index (H).
 *
 * Returns a value in [0, ln(n)] where 0 = no diversity
 * (single category) and ln(n) = maximum diversity
 * (perfectly even distribution across n categories).
 *
 * Returns 0 for empty input or single-category input.
 */
export function computeShannonDiversity(counts: Record<string, number>): number {
  const values = Object.values(counts);
  const total = values.reduce((sum, v) => sum + v, 0);

  if (total === 0) return 0;

  let h = 0;
  for (const v of values) {
    if (v === 0) continue;
    const p = v / total;
    h -= p * Math.log(p);
  }

  return Math.round(h * 1_000_000) / 1_000_000;
}
