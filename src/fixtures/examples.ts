import { registry, MODES, QUESTION_SET_VERSION } from '../../shared/questions';
import { analysisSchema, type Analysis, type Answer } from '../../shared/schema';
import captured from './captured.json' with { type: 'json' };
import { analysisVersions } from '../../shared/versions';

export { sources } from './sources';
import { sources } from './sources';

function synthetic(source: (typeof sources)[number]): Analysis {
  let scoreIndex = 0,
    noulIndex = 0;
  const answers: Record<string, Answer> = {};
  for (const q of registry) {
    if (q.type === 'choice') {
      const probabilities = Object.fromEntries(
        MODES.map((mode) => [mode, mode === source.mode ? 0.76 : 0.03]),
      );
      answers[q.id] = { type: 'choice', choice: source.mode, confidence: 0.68, probabilities };
    } else if (q.type === 'score') {
      const score = source.scores[scoreIndex++];
      const lo = Math.floor(score),
        hi = Math.ceil(score);
      const probabilities = Object.fromEntries(
        q.criteria.map((_, i) => [
          String(i),
          lo === hi ? Number(i === lo) : i === lo ? hi - score : i === hi ? score - lo : 0,
        ]),
      );
      answers[q.id] = {
        type: 'score',
        score,
        confidence: 1 - (hi === lo ? 0 : Math.min(score - lo, hi - score)),
        probabilities,
        legend: Object.fromEntries(q.criteria.map((label, i) => [String(i), label])),
      };
    } else answers[q.id] = { type: 'noul', noul: source.nouls[noulIndex++] };
  }
  return analysisSchema.parse({
    ...analysisVersions,
    id: source.id,
    title: source.title,
    sourceType: 'example',
    provenance: 'synthetic',
    questionSetVersion: QUESTION_SET_VERSION,
    createdAt: '2026-09-21T00:00:00Z',
    elapsedMs: 0,
    timings: { extractionMs: 0, modelMs: 0, totalMs: 0 },
    result: { model: 'Design study · synthetic', answers },
  });
}
export const syntheticExamples = sources.map(synthetic);
export const examples = sources.map((source) => {
  const real = captured.find((example) => example.id === source.id);
  return real ? analysisSchema.parse(real) : synthetic(source);
});
