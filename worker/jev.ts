import { questions, QUESTION_SET_VERSION } from '../shared/questions';
import { modelSchema, unwrapModel, type Analysis } from '../shared/schema';
import { ApiError } from './input';
import { analysisVersions } from '../shared/versions';

export type JevRun = (
  ...args: Parameters<Cloudflare.LiveEnv['AI']['run']>
) => ReturnType<Cloudflare.LiveEnv['AI']['run']>;
export async function analyzeText(
  text: string,
  ai: { run: JevRun },
  gatewayId: string,
  page?: { url: string; title: string },
): Promise<Analysis> {
  const started = performance.now();
  let raw: unknown;
  try {
    raw = await ai.run(
      'typesafe/jev',
      {
        state: {
          source_type: page ? 'webpage' : 'text',
          ...(page ? { url: page.url, title: page.title } : {}),
          content: text,
        },
        questions,
      },
      {
        gateway: {
          id: gatewayId,
          collectLog: false,
          skipCache: true,
          requestTimeoutMs: 25000,
          metadata: {
            app: 'jevprint',
            question_set: QUESTION_SET_VERSION,
            source_type: page ? 'url' : 'text',
          },
        },
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    throw new ApiError(
      'UPSTREAM_UNAVAILABLE',
      'Jev is unavailable right now. Please try an example, or try again later.',
      502,
    );
  }
  const parsed = modelSchema.safeParse(unwrapModel(raw));
  if (!parsed.success) {
    console.warn(
      JSON.stringify({
        event: 'invalid_model_response',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          code: issue.code,
          detail: issue.code === 'custom' ? issue.message : undefined,
        })),
      }),
    );
    throw new ApiError(
      'INVALID_MODEL_RESPONSE',
      'The model returned an incomplete reading. Your previous fingerprint is still here.',
      502,
    );
  }
  const modelMs = Math.round(performance.now() - started);
  return {
    ...analysisVersions,
    id: crypto.randomUUID(),
    title: 'Your words, another shape',
    sourceType: 'text',
    provenance: 'live',
    questionSetVersion: QUESTION_SET_VERSION,
    createdAt: new Date().toISOString(),
    elapsedMs: modelMs,
    timings: { extractionMs: 0, modelMs, totalMs: modelMs },
    result: parsed.data,
  };
}
