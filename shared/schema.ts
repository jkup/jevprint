import { z } from 'zod';
import { MODES, QUESTION_SET_VERSION, registry } from './questions';
import { SCHEMA_VERSION, PREPROCESSING_VERSION, MAPPING_VERSION } from './versions';

const probability = z.number().finite().min(0).max(1);
const distribution = z.record(z.string(), probability);
export const answerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), noul: probability }),
  z.object({
    type: z.literal('choice'),
    choice: z.string(),
    confidence: probability,
    probabilities: distribution,
  }),
  z.object({
    type: z.literal('score'),
    score: z.number().finite(),
    confidence: probability,
    probabilities: distribution,
    legend: z.record(z.string(), z.string()),
  }),
]);
export type Answer = z.infer<typeof answerSchema>;
export const modelSchema = z
  .object({
    model: z.string().min(1),
    answers: z.record(z.string(), answerSchema),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
      })
      .optional(),
  })
  .superRefine((result, ctx) => {
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (Object.keys(result.answers).length !== registry.length)
      invalid('Unexpected question count');
    for (const q of registry) {
      const answer = result.answers[q.id];
      if (!answer || answer.type !== q.type) {
        invalid(`Missing or wrong answer type: ${q.id}`);
        continue;
      }
      if (answer.type === 'noul') continue;
      const keys =
        q.type === 'choice'
          ? [...MODES]
          : q.type === 'score'
            ? q.criteria.map((_, i) => String(i))
            : [];
      const values = keys.map((key) => answer.probabilities[key]);
      // Provider probabilities are rounded to two decimals. Bound total rounding error
      // by half a displayed unit per option, never repair missing/negative values.
      const massTolerance = keys.length * 0.005 + 1e-8;
      if (
        Object.keys(answer.probabilities).length !== keys.length ||
        values.some((p) => p === undefined) ||
        Math.abs(values.reduce((a, b) => a + b, 0) - 1) > massTolerance
      )
        invalid(`Invalid distribution: ${q.id}`);
      if (
        answer.type === 'choice' &&
        (!keys.includes(answer.choice) ||
          answer.probabilities[answer.choice] < Math.max(...values) - 0.005)
      )
        invalid(`Invalid winning choice: ${q.id}`);
      if (answer.type === 'score' && q.type === 'score') {
        const expected = values.reduce((sum, p, i) => sum + p * i, 0);
        if (
          answer.score < 0 ||
          answer.score > keys.length - 1 ||
          Math.abs(answer.score - expected) > 0.025
        )
          invalid(`Invalid score: ${q.id}`);
        if (
          Object.keys(answer.legend).length !== keys.length ||
          keys.some((k, i) => answer.legend[k] !== q.criteria[i])
        )
          invalid(`Invalid legend: ${q.id}`);
      }
    }
  });
export type ModelResult = z.infer<typeof modelSchema>;
// Cloudflare's third-party binding wraps provider results; direct/captured data may not.
export function unwrapModel(raw: unknown): unknown {
  return typeof raw === 'object' && raw !== null && 'result' in raw ? raw.result : raw;
}
export const analysisSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  sourceType: z.enum(['text', 'url', 'example']),
  provenance: z.enum(['synthetic', 'live', 'captured']),
  questionSetVersion: z.literal(QUESTION_SET_VERSION),
  schemaVersion: z.literal(SCHEMA_VERSION),
  preprocessingVersion: z.literal(PREPROCESSING_VERSION),
  mappingVersion: z.literal(MAPPING_VERSION),
  createdAt: z.string(),
  elapsedMs: z.number().nonnegative(),
  timings: z.object({
    extractionMs: z.number().nonnegative(),
    modelMs: z.number().nonnegative(),
    totalMs: z.number().nonnegative(),
  }),
  result: modelSchema,
  source: z
    .object({
      url: z.string().url(),
      excerpt: z.string().max(12000),
      reduced: z.boolean(),
      originalBytes: z.number().nonnegative(),
      extractionMs: z.number().nonnegative(),
    })
    .optional(),
});
export type Analysis = z.infer<typeof analysisSchema>;
