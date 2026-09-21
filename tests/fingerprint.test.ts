import { describe, expect, it } from 'vitest';
import { examples } from '../src/fixtures/examples';
import { entropy, fingerprint, interpolate, point, positions } from '../shared/fingerprint';
import { modelSchema, unwrapModel } from '../shared/schema';

describe('model boundary', () => {
  it('accepts all studies and the observed Cloudflare result envelope', () => {
    for (const example of examples)
      expect(modelSchema.safeParse(example.result).success).toBe(true);
    expect(
      modelSchema.parse(unwrapModel({ result: examples[0].result, state: 'complete' })),
    ).toEqual(examples[0].result);
  });
  it.each(['missing', 'nonfinite', 'negative', 'mass', 'score', 'legend', 'taxonomy'])(
    'rejects %s semantic corruption',
    (kind) => {
      const raw = structuredClone(examples[0].result);
      const mode = raw.answers.primary_mode;
      const score = raw.answers.complexity;
      if (mode.type !== 'choice' || score.type !== 'score') throw new Error('Bad test data');
      if (kind === 'missing') delete raw.answers.urgency;
      if (kind === 'nonfinite') mode.probabilities.reference = NaN;
      if (kind === 'negative') mode.probabilities.reference = -0.2;
      if (kind === 'mass') mode.probabilities.reference = 0.1;
      if (kind === 'score') score.score = 0;
      if (kind === 'legend') delete score.legend['4'];
      if (kind === 'taxonomy') mode.choice = 'invented';
      expect(modelSchema.safeParse(raw).success).toBe(false);
    },
  );
});
describe('visual translation', () => {
  it('normalizes entropy at its mathematical boundaries', () => {
    expect(entropy([1, 0, 0])).toBe(0);
    expect(entropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1);
    expect(entropy([1])).toBe(0);
  });
  it('is deterministic and produces finite bounded geometry for all examples', () => {
    for (const example of examples) {
      const f = fingerprint(example.result);
      const p = positions(f);
      expect(p).toEqual(positions(f));
      expect([...p].every((x) => Number.isFinite(x) && Math.abs(x) < 4)).toBe(true);
    }
  });
  it('preserves morph endpoints and changes continuously', () => {
    const a = fingerprint(examples[0].result),
      b = fingerprint(examples[1].result);
    expect(interpolate(a, b, 0)).toEqual(a);
    const endpoint = point(interpolate(a, b, 1), 16, 45);
    point(b, 16, 45).forEach((v, i) => expect(endpoint[i]).toBeCloseTo(v, 10));
    const left = point(interpolate(a, b, 0.5), 16, 45);
    const right = point(interpolate(a, b, 0.5001), 16, 45);
    expect(Math.hypot(...left.map((v, i) => v - right[i]))).toBeLessThan(0.001);
  });
  it('retains distribution differences even when the mean score is identical', () => {
    const a = structuredClone(examples[0].result),
      b = structuredClone(a);
    const x = a.answers.complexity,
      y = b.answers.complexity;
    if (x.type !== 'score' || y.type !== 'score') throw new Error('Bad test data');
    x.score = y.score = 2;
    x.probabilities = { '0': 0, '1': 0, '2': 1, '3': 0, '4': 0 };
    y.probabilities = { '0': 0.5, '1': 0, '2': 0, '3': 0, '4': 0.5 };
    const f = fingerprint(a),
      g = fingerprint(b);
    expect(f.values.complexity).toBe(g.values.complexity);
    expect(f.spread).not.toBe(g.spread);
    expect(positions(f)).not.toEqual(positions(g));
  });
});
