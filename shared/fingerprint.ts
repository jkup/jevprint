import type { Analysis, Answer, ModelResult } from './schema';
import { MODES, registry } from './questions';

export { MAPPING_VERSION } from './versions';
export const STRANDS = 72;
export const SEGMENTS = 160;
export function entropy(probabilities: number[]): number {
  if (probabilities.length < 2) return 0;
  return Math.max(
    0,
    -probabilities.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0) /
      Math.log(probabilities.length),
  );
}
export function normalized(answer: Answer): number {
  if (answer.type === 'noul') return answer.noul;
  if (answer.type === 'score') return answer.score / (Object.keys(answer.probabilities).length - 1);
  return entropy(Object.values(answer.probabilities));
}
export type Fingerprint = {
  modes: number[];
  values: Record<string, number>;
  spread: number;
  coherence: number;
  entropy: number;
  color: [number, number, number];
};
const palette = [
  [0.63, 0.88, 0.72],
  [1, 0.54, 0.32],
  [0.87, 0.9, 0.61],
  [0.98, 0.71, 0.4],
  [0.8, 0.71, 0.95],
  [0.62, 0.74, 0.93],
  [0.96, 0.63, 0.68],
  [0.62, 0.89, 0.86],
  [0.8, 0.82, 0.8],
];
export function fingerprint(result: ModelResult): Fingerprint {
  const primary = result.answers.primary_mode;
  if (primary.type !== 'choice') throw new Error('Primary mode must be a Choice');
  const mass = Object.values(primary.probabilities).reduce((sum, p) => sum + p, 0);
  const modes = MODES.map((mode) => primary.probabilities[mode] / mass);
  const values = Object.fromEntries(registry.map((q) => [q.id, normalized(result.answers[q.id])]));
  const scores = Object.values(result.answers).filter((a) => a.type === 'score');
  const spread =
    scores.reduce(
      (sum, a) =>
        sum +
        Object.entries(a.probabilities).reduce(
          (v, [key, p]) => v + p * ((Number(key) - a.score) / 4) ** 2,
          0,
        ),
      0,
    ) / scores.length;
  const confidence = Object.values(result.answers).filter((a) => a.type !== 'noul');
  return {
    modes,
    values,
    spread,
    coherence: confidence.reduce((sum, a) => sum + a.confidence, 0) / confidence.length,
    entropy: entropy(modes),
    color: [0, 1, 2].map((c) => modes.reduce((sum, p, i) => sum + p * palette[i][c], 0)) as [
      number,
      number,
      number,
    ],
  };
}
export function interpolate(a: Fingerprint, b: Fingerprint, t: number): Fingerprint {
  const mix = (x: number, y: number) => x + (y - x) * Math.max(0, Math.min(1, t));
  return {
    modes: a.modes.map((v, i) => mix(v, b.modes[i])),
    values: Object.fromEntries(
      Object.keys(a.values).map((k) => [k, mix(a.values[k], b.values[k])]),
    ),
    spread: mix(a.spread, b.spread),
    coherence: mix(a.coherence, b.coherence),
    entropy: mix(a.entropy, b.entropy),
    color: a.color.map((v, i) => mix(v, b.color[i])) as [number, number, number],
  };
}

/** Fixed particle correspondence: index is independent of input, model, and quality level. */
export function point(f: Fingerprint, strand: number, step: number): [number, number, number] {
  const v = (strand + 0.5) / STRANDS;
  const u = (step / SEGMENTS) * Math.PI * 2;
  const phi = v * Math.PI * 2;
  const lat = (v - 0.5) * Math.PI;
  const r = 1.25;
  const bases = [
    [r * Math.cos(lat) * Math.cos(u), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(u)],
    [(0.35 + v) * Math.cos(u), (v - 0.5) * 2.8, (0.35 + v) * Math.sin(u)],
    [
      (0.75 + v * 0.45) * Math.cos(u),
      (v - 0.5) * 2 + Math.sin(u) * 0.15,
      (0.75 + v * 0.45) * Math.sin(u),
    ],
    [(0.25 + v * v * 1.25) * Math.cos(u), (v - 0.5) * 2.5, (0.25 + v * v * 1.25) * Math.sin(u)],
    [
      (0.8 + 0.42 * Math.cos(phi)) * Math.cos(u),
      0.6 * Math.sin(phi) + 0.45 * Math.sin(u * 2),
      (0.8 + 0.42 * Math.cos(phi)) * Math.sin(u),
    ],
    [
      1.4 * Math.cos(u),
      0.65 * Math.sin(u * 2) + (v - 0.5) * 0.75,
      0.65 * Math.sin(u) + 0.4 * Math.cos(phi),
    ],
    [
      (0.92 + 0.35 * Math.cos(phi)) * Math.cos(u),
      (0.92 + 0.35 * Math.cos(phi)) * Math.sin(u),
      0.6 * Math.sin(phi) + 0.32 * Math.sin(u * 3),
    ],
    [
      1.1 * Math.sign(Math.cos(u)) * Math.sqrt(Math.abs(Math.cos(u))),
      (v - 0.5) * 2,
      1.1 * Math.sign(Math.sin(u)) * Math.sqrt(Math.abs(Math.sin(u))),
    ],
    [
      Math.cos(u) * (1 + 0.2 * Math.sin(phi)),
      Math.sin(u) * (1 + 0.2 * Math.sin(phi)),
      0.7 * Math.cos(phi),
    ],
  ];
  let x = 0,
    y = 0,
    z = 0;
  bases.forEach((p, i) => {
    x += p[0] * f.modes[i];
    y += p[1] * f.modes[i];
    z += p[2] * f.modes[i];
  });
  const d = f.values;
  const layer = 1 + d.complexity * 0.13 * Math.cos(phi * 4);
  const ripple =
    (0.015 + f.entropy * 0.08 + f.spread * 0.8) * Math.sin(u * (3 + 5 * d.quantitative) + phi * 5);
  const asymmetry = d.novelty * 0.14 * Math.sin(u * 3 + phi * 2);
  const pair = d.personal_voice * 0.05 * Math.sin(phi * 36);
  const scale = (0.85 + d.abstraction * 0.3) * layer + ripple + pair;
  x = x * scale + asymmetry + d.persuasive * 0.18 * y;
  y =
    y * scale +
    d.actionability * 0.1 * Math.sin(u) +
    d.exploratory * 0.12 * Math.sin(phi * 7 + u * 2);
  z = z * scale + asymmetry * Math.cos(u);
  x *= 1 - d.commercial_intent * 0.18 * ((y + 2) / 4);
  return [x, y, z];
}
export function positions(f: Fingerprint): Float32Array {
  const buffer = new Float32Array(STRANDS * (SEGMENTS + 1) * 3);
  for (let s = 0; s < STRANDS; s++)
    for (let j = 0; j <= SEGMENTS; j++) buffer.set(point(f, s, j), (s * (SEGMENTS + 1) + j) * 3);
  return buffer;
}
export function difference(a: Analysis, b: Analysis) {
  return registry
    .filter((q) => q.type !== 'choice')
    .map((q) => {
      const delta = normalized(b.result.answers[q.id]) - normalized(a.result.answers[q.id]);
      return {
        id: q.id,
        label: q.label,
        delta,
        display:
          q.type === 'score'
            ? `${delta >= 0 ? '+' : '−'}${Math.abs(delta * 4).toFixed(1)} / 4`
            : `${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) * 100)} pp`,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}
