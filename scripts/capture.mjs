// Makes at most four paid requests, sequentially. Only original public demo texts are sent.
import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});
try {
  const { sources } = await server.ssrLoadModule('/src/fixtures/sources.ts');
  const { analysisSchema } = await server.ssrLoadModule('/shared/schema.ts');
  const file = new URL('../src/fixtures/captured.json', import.meta.url);
  const previous = await readFile(file, 'utf8')
    .then(JSON.parse)
    .catch(() => []);
  const captures = previous.filter((capture) => analysisSchema.safeParse(capture).success);
  for (const source of sources) {
    if (captures.some((capture) => capture.id === source.id)) continue;
    const response = await fetch('http://127.0.0.1:8788/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'text', text: source.text }),
      signal: AbortSignal.timeout(40_000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`${source.id}: ${response.status} ${body.error?.code}`);
    const analysis = analysisSchema.parse(body);
    captures.push({
      ...analysis,
      id: source.id,
      title: source.title,
      sourceType: 'example',
      provenance: 'captured',
    });
    await writeFile(file, JSON.stringify(captures, null, 2) + '\n');
    console.log(
      JSON.stringify({
        sample: source.id,
        model: analysis.result.model,
        elapsedMs: analysis.elapsedMs,
        usage: analysis.result.usage,
      }),
    );
  }
} finally {
  await server.close();
}
