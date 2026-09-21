// Deliberate paid integration check: one original text + one Cloudflare docs page.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:5174/');
  if (!process.argv.includes('--url-only')) {
    await page.getByRole('button', { name: /Make a fingerprint/ }).click();
    await page
      .getByLabel('Text to analyze')
      .fill(
        'This proposal defines a simple queue. Each message receives an increasing sequence number. Consumers acknowledge delivery and store a checkpoint. If a consumer disconnects, it resumes from the last acknowledged message. We should test recovery behavior before releasing the system.',
      );
    const textResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/analyze'),
    );
    await page.getByRole('button', { name: /Find its fingerprint/ }).click();
    const response = await textResponse;
    const result = await response.json();
    console.log(
      JSON.stringify({
        step: 'text',
        status: response.status(),
        model: result.result?.model,
        elapsedMs: result.elapsedMs,
        error: result.error?.code,
      }),
    );
    if (!response.ok()) throw new Error('Live text check failed');
    await page.getByRole('heading', { name: 'Your words, another shape' }).waitFor();
    await page.screenshot({ path: 'docs/screenshots/live-text.png', fullPage: true });
  }
  const urlResponse = await page.request.post('http://127.0.0.1:5174/api/analyze', {
    data: { sourceType: 'url', url: 'https://developers.cloudflare.com/ai/models/typesafe/jev/' },
    timeout: 60_000,
  });
  const urlResult = await urlResponse.json();
  console.log(
    JSON.stringify({
      step: 'url',
      status: urlResponse.status(),
      model: urlResult.result?.model,
      extractionMs: urlResult.source?.extractionMs,
      reduced: urlResult.source?.reduced,
      error: urlResult.error?.code,
    }),
  );
  if (!urlResponse.ok()) throw new Error('Live URL check failed');
} finally {
  await browser.close();
}
