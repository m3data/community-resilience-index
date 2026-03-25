/**
 * TEST-012 — Quadrant classification (SPEC-001 ADR-002, REQ-012)
 * TEST-024 — Action selection logic (SPEC-001 REQ-019)
 */

import { describe, it, expect } from 'vitest';
import {
  classifyQuadrant,
  selectActions,
  type QuadrantResult,
  type Action,
} from './quadrant';

describe('classifyQuadrant (TEST-012)', () => {
  it('classifies high resilience, low crisis as "monitor"', () => {
    const result = classifyQuadrant(4.0, 3.0);
    expect(result.classification).toBe('monitor');
    expect(result.label).toBe('Monitor');
    expect(result.actionFramingText).toBe(
      'Your community has capacity. Stay prepared.',
    );
  });

  it('classifies high resilience, high crisis as "stress-tested"', () => {
    const result = classifyQuadrant(4.0, 7.0);
    expect(result.classification).toBe('stress-tested');
    expect(result.label).toBe('Stress-Tested');
    expect(result.actionFramingText).toBe(
      'Your community has capacity and it\u2019s being drawn on. Activate mutual support.',
    );
  });

  it('classifies low resilience, low crisis as "structurally-fragile"', () => {
    const result = classifyQuadrant(2.0, 3.0);
    expect(result.classification).toBe('structurally-fragile');
    expect(result.label).toBe('Structurally Fragile');
    expect(result.actionFramingText).toBe(
      'Your community has gaps to address. Build capacity now.',
    );
  });

  it('classifies low resilience, high crisis as "critical"', () => {
    const result = classifyQuadrant(2.0, 7.0);
    expect(result.classification).toBe('critical');
    expect(result.label).toBe('Critical Priority');
    expect(result.actionFramingText).toBe(
      'Your community needs immediate mutual support and long-term capacity building.',
    );
  });

  describe('boundary conditions', () => {
    it('BRIC=3.0, INFORM=5.0 → "stress-tested" (>= on both thresholds)', () => {
      const result = classifyQuadrant(3.0, 5.0);
      expect(result.classification).toBe('stress-tested');
    });

    it('BRIC=2.99, INFORM=4.99 → "structurally-fragile" (just below both)', () => {
      const result = classifyQuadrant(2.99, 4.99);
      expect(result.classification).toBe('structurally-fragile');
    });

    it('BRIC=3.0, INFORM=4.99 → "monitor" (on resilience, below crisis)', () => {
      const result = classifyQuadrant(3.0, 4.99);
      expect(result.classification).toBe('monitor');
    });

    it('BRIC=2.99, INFORM=5.0 → "critical" (below resilience, on crisis)', () => {
      const result = classifyQuadrant(2.99, 5.0);
      expect(result.classification).toBe('critical');
    });
  });

  describe('custom thresholds', () => {
    it('changing thresholds moves postcodes between quadrants', () => {
      // With default thresholds (3.0, 5.0): BRIC=2.5, INFORM=4.0 → structurally-fragile
      const defaultResult = classifyQuadrant(2.5, 4.0);
      expect(defaultResult.classification).toBe('structurally-fragile');

      // With lower thresholds (2.0, 3.0): same scores → stress-tested
      const customResult = classifyQuadrant(2.5, 4.0, {
        resilience: 2.0,
        crisis: 3.0,
      });
      expect(customResult.classification).toBe('stress-tested');
    });

    it('all four quadrants are reachable with any valid thresholds', () => {
      const t = { resilience: 4.0, crisis: 6.0 };
      expect(classifyQuadrant(5.0, 3.0, t).classification).toBe('monitor');
      expect(classifyQuadrant(5.0, 8.0, t).classification).toBe('stress-tested');
      expect(classifyQuadrant(2.0, 3.0, t).classification).toBe('structurally-fragile');
      expect(classifyQuadrant(2.0, 8.0, t).classification).toBe('critical');
    });
  });

  it('is deterministic: same inputs always produce the same result', () => {
    const results: QuadrantResult[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(classifyQuadrant(3.5, 4.5));
    }
    for (const r of results) {
      expect(r).toEqual(results[0]);
    }
  });
});

describe('selectActions (TEST-024)', () => {
  const ALL_QUADRANTS = [
    'monitor',
    'stress-tested',
    'structurally-fragile',
    'critical',
  ] as const;

  it('returns non-empty array for all quadrants with empty weak profiles', () => {
    for (const q of ALL_QUADRANTS) {
      const actions = selectActions(q, [], []);
      expect(actions.length).toBeGreaterThan(0);
    }
  });

  it('every action has all required fields', () => {
    for (const q of ALL_QUADRANTS) {
      const actions = selectActions(q, ['economic', 'social'], ['exposure']);
      for (const action of actions) {
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('category');
        expect(action).toHaveProperty('title');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('guide_section');
        expect(['immediate', 'this_week', 'this_month', 'ongoing']).toContain(
          action.priority,
        );
        expect(['household', 'community', 'advocacy']).toContain(
          action.category,
        );
        expect(action.title.length).toBeGreaterThan(0);
        expect(action.description.length).toBeGreaterThan(0);
        expect(action.guide_section).toMatch(/^#/);
      }
    }
  });

  it('every quadrant includes at least one action per category', () => {
    for (const q of ALL_QUADRANTS) {
      const actions = selectActions(q, [], []);
      const categories = new Set(actions.map((a) => a.category));
      expect(categories).toContain('household');
      expect(categories).toContain('community');
      expect(categories).toContain('advocacy');
    }
  });

  it('critical quadrant includes at least one "immediate" priority action', () => {
    const actions = selectActions('critical', [], []);
    const hasImmediate = actions.some((a) => a.priority === 'immediate');
    expect(hasImmediate).toBe(true);
  });

  it('monitor quadrant has no "immediate" priority actions', () => {
    const actions = selectActions('monitor', [], []);
    const hasImmediate = actions.some((a) => a.priority === 'immediate');
    expect(hasImmediate).toBe(false);
  });

  it('different weak profiles produce different action sets', () => {
    const actionsA = selectActions('critical', ['economic'], []);
    const actionsB = selectActions('critical', ['social'], []);
    const titlesA = actionsA.map((a) => a.title).sort();
    const titlesB = actionsB.map((a) => a.title).sort();
    expect(titlesA).not.toEqual(titlesB);
  });

  describe('critical + weak economic/community example', () => {
    const actions = selectActions('critical', ['economic', 'community'], []);
    const titles = actions.map((a) => a.title);

    it('includes "Reduce household fuel dependency" (household)', () => {
      expect(titles).toContain('Reduce household fuel dependency');
      const action = actions.find(
        (a) => a.title === 'Reduce household fuel dependency',
      )!;
      expect(action.category).toBe('household');
    });

    it('includes "Start a community circle" (community)', () => {
      expect(titles).toContain('Start a community circle');
      const action = actions.find(
        (a) => a.title === 'Start a community circle',
      )!;
      expect(action.category).toBe('community');
    });

    it('includes "Contact your MP about fuel reserves" (advocacy)', () => {
      expect(titles).toContain('Contact your MP about fuel reserves');
      const action = actions.find(
        (a) => a.title === 'Contact your MP about fuel reserves',
      )!;
      expect(action.category).toBe('advocacy');
    });
  });

  describe('monitor + no weak capitals example', () => {
    const actions = selectActions('monitor', [], []);
    const titles = actions.map((a) => a.title);

    it('includes "Maintain preparedness" (household)', () => {
      expect(titles).toContain('Maintain preparedness');
    });

    it('includes generic community actions', () => {
      const communityActions = actions.filter(
        (a) => a.category === 'community',
      );
      expect(communityActions.length).toBeGreaterThan(0);
    });

    it('includes ongoing institutional engagement (advocacy)', () => {
      const advocacyActions = actions.filter((a) => a.category === 'advocacy');
      expect(advocacyActions.length).toBeGreaterThan(0);
      expect(advocacyActions.some((a) => a.priority === 'ongoing')).toBe(true);
    });
  });

  it('weak pillars add relevant actions', () => {
    const withPillars = selectActions('critical', [], [
      'exposure',
      'sensitivity',
    ]);
    const without = selectActions('critical', [], []);
    expect(withPillars.length).toBeGreaterThan(without.length);
  });
});
