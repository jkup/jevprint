import { z } from 'zod';

export const MAX_REQUEST_BYTES = 32_000;
export const MAX_TEXT_BYTES = 12_000;
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
export async function readBounded(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError('INVALID_INPUT', 'Send JSON content.', 415);
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES)
    throw new ApiError('TOO_LARGE', 'Please use a shorter excerpt.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_INPUT', 'Please provide some text.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ApiError('TOO_LARGE', 'Please use a shorter excerpt.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError('INVALID_INPUT', 'The request could not be read.');
  }
}
export const inputSchema = z.discriminatedUnion('sourceType', [
  z.object({ sourceType: z.literal('text'), text: z.string() }).strict(),
  z.object({ sourceType: z.literal('url'), url: z.string().max(2048) }).strict(),
]);
export function validateText(text: string): string {
  const normalized = normalizeText(text);
  if (normalized.length < 40 || normalized.split(/\s+/).length < 6)
    throw new ApiError(
      'INSUFFICIENT_CONTENT',
      'Add at least a few sentences so there is something to explore.',
    );
  if (new TextEncoder().encode(normalized).byteLength > MAX_TEXT_BYTES)
    throw new ApiError(
      'TOO_LARGE',
      'Please use an excerpt under 12 KB. Your text has not been truncated.',
      413,
    );
  return normalized;
}
