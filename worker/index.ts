import { analyzeText } from './jev';
import { ApiError, inputSchema, readBounded, validateText } from './input';
import { extractPage } from './extract';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export default {
  async fetch(request, env): Promise<Response> {
    const started = performance.now();
    const url = new URL(request.url);
    // Live mode is a local integration pilot. Public endpoints remain disabled until abuse controls are verified.
    const live =
      String(env.LIVE_ANALYSIS) === 'true' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.pathname === '/api/config')
      return json({ textEnabled: live, urlEnabled: live && !!env.BROWSER });
    if (url.pathname !== '/api/analyze') {
      if (url.pathname.startsWith('/api/'))
        return json({ error: { code: 'NOT_FOUND', message: 'Unknown endpoint.' } }, 404);
      return env.ASSETS.fetch(request);
    }
    if (request.method !== 'POST')
      return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405);
    try {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin)
        throw new ApiError('FORBIDDEN', 'This request is not allowed.', 403);
      if (!live || !env.AI)
        throw new ApiError(
          'LIVE_DISABLED',
          'Live analysis is being connected. Explore the four studies in the meantime.',
          503,
        );
      const body = inputSchema.safeParse(await readBounded(request));
      if (!body.success) throw new ApiError('INVALID_INPUT', 'Please provide text or a valid URL.');
      if (body.data.sourceType === 'url') {
        if (!env.BROWSER)
          throw new ApiError(
            'URL_DISABLED',
            'Webpage reading is coming next. Paste the page’s text instead.',
            503,
          );
        const page = await extractPage(body.data.url, env.BROWSER);
        const analysis = await analyzeText(page.content, env.AI, env.GATEWAY_ID, page);
        return json({
          ...analysis,
          title: page.title,
          sourceType: 'url',
          timings: {
            extractionMs: page.extractionMs,
            modelMs: analysis.elapsedMs,
            totalMs: Math.round(performance.now() - started),
          },
          source: {
            url: page.url,
            excerpt: page.content,
            reduced: page.reduced,
            originalBytes: page.originalBytes,
            extractionMs: page.extractionMs,
          },
        });
      }
      const analysis = await analyzeText(validateText(body.data.text), env.AI, env.GATEWAY_ID);
      return json({
        ...analysis,
        timings: { ...analysis.timings, totalMs: Math.round(performance.now() - started) },
      });
    } catch (error) {
      const safe =
        error instanceof ApiError
          ? error
          : new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500);
      return json({ error: { code: safe.code, message: safe.message } }, safe.status);
    }
  },
} satisfies ExportedHandler<Env>;
