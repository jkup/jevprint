import { z } from 'zod';
import { URL_PILOT_HOSTS } from '../shared/limits';
import { ApiError, MAX_TEXT_BYTES, normalizeText, validateText } from './input';

const encoder = new TextEncoder();
export const browserAllowPattern =
  /^https:\/\/(?:developers\.cloudflare\.com|blog\.cloudflare\.com)\//.source;
export function validateUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ApiError('INVALID_URL', 'Please enter a complete https:// URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !URL_PILOT_HOSTS.some((host) => host === url.hostname)
  ) {
    throw new ApiError(
      'URL_NOT_SUPPORTED',
      'The URL pilot supports developers.cloudflare.com and blog.cloudflare.com. Paste text from other sites instead.',
    );
  }
  url.hash = '';
  return url;
}

/** Deterministic, whole-paragraph sampling; never silently call it the full page. */
export function reduceContent(
  markdown: string,
  budget = MAX_TEXT_BYTES,
): { content: string; reduced: boolean; originalBytes: number } {
  const clean = normalizeText(markdown);
  const originalBytes = encoder.encode(clean).length;
  if (originalBytes <= budget) return { content: clean, reduced: false, originalBytes };
  const paragraphs = clean
    .split(/\n\s*\n/)
    .flatMap((p) => (p.length > 1800 ? (p.match(/[\s\S]{1,1500}/gu) ?? []) : [p]));
  const selected = new Set<number>();
  let used = 0;
  const add = (i: number) => {
    if (selected.has(i) || i < 0 || i >= paragraphs.length) return;
    const size = encoder.encode(paragraphs[i]).length + 2;
    if (used + size <= budget) {
      selected.add(i);
      used += size;
    }
  };
  add(0);
  add(1);
  add(paragraphs.length - 1);
  paragraphs.forEach((p, i) => {
    if (/^#{1,3} /.test(p) && p.length < 150) add(i);
  });
  // Sample across the entire document before filling remaining space.
  for (let i = 1; i < 16; i++) add(Math.floor((i * (paragraphs.length - 1)) / 16));
  for (let i = 0; i < paragraphs.length; i++) add(i);
  return {
    content: [...selected]
      .sort((a, b) => a - b)
      .map((i) => paragraphs[i])
      .join('\n\n'),
    reduced: true,
    originalBytes,
  };
}

async function readExtraction(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader)
    throw new ApiError(
      'EXTRACTION_FAILED',
      'We couldn’t read this page. Paste its text instead.',
      502,
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 250_000) {
        await reader.cancel();
        throw new ApiError(
          'EXTRACTION_TOO_LARGE',
          'This page is too large to read. Paste a shorter excerpt instead.',
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(
      'EXTRACTION_FAILED',
      'We couldn’t read this page. Paste its text instead.',
      502,
    );
  }
}

export async function extractPage(input: string, browser: Cloudflare.LiveEnv['BROWSER']) {
  const url = validateUrl(input);
  const started = performance.now();
  let response: Response;
  try {
    response = await browser.quickAction('markdown', {
      url: url.href,
      cacheTTL: 0,
      gotoOptions: { waitUntil: 'domcontentloaded', timeout: 15000 },
      actionTimeout: 15000,
      allowRequestPattern: [browserAllowPattern],
      rejectResourceTypes: ['image', 'font', 'media', 'websocket'],
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'browser_binding_failed',
        kind: error instanceof Error ? error.name : 'unknown',
      }),
    );
    throw new ApiError(
      'EXTRACTION_FAILED',
      'We couldn’t read this page. Paste its text instead.',
      502,
    );
  }
  if (!response.ok) {
    const failure = z
      .object({ errors: z.array(z.object({ code: z.number() })).optional() })
      .safeParse(await readExtraction(response));
    console.warn(
      JSON.stringify({
        event: 'extraction_failed',
        status: response.status,
        codes: failure.success ? failure.data.errors?.map((e) => e.code) : [],
      }),
    );
    throw new ApiError(
      'EXTRACTION_FAILED',
      'We couldn’t read this page. Paste its text instead.',
      502,
    );
  }
  const raw = await readExtraction(response);
  const result = z
    .object({ success: z.literal(true), result: z.string().max(250_000) })
    .safeParse(raw);
  if (!result.success) {
    console.warn(
      JSON.stringify({
        event: 'extraction_shape',
        keys: typeof raw === 'object' && raw !== null ? Object.keys(raw) : typeof raw,
      }),
    );
    throw new ApiError(
      'EXTRACTION_FAILED',
      'We couldn’t read this page. Paste its text instead.',
      502,
    );
  }
  const markdown = result.data.result;
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1];
  const title = (heading ?? url.hostname).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 180);
  if (/^(just a moment|access denied|attention required|page not found|404)/i.test(title))
    throw new ApiError(
      'EXTRACTION_FAILED',
      'This page is blocked or unavailable. Paste its text instead.',
      422,
    );
  const main = heading ? markdown.slice(markdown.indexOf(`# ${heading}`)) : markdown;
  const reduced = reduceContent(main);
  let content: string;
  try {
    content = validateText(reduced.content);
  } catch {
    throw new ApiError(
      'EXTRACTION_EMPTY',
      'This page didn’t contain enough readable text. Paste its text instead.',
      422,
    );
  }
  return {
    title,
    url: url.href,
    content,
    reduced: reduced.reduced,
    originalBytes: reduced.originalBytes,
    extractionMs: Math.round(performance.now() - started),
  };
}
