import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { examples } from '../../src/fixtures/examples';

test('examples, inspection, morphing, and motion controls work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /What shape/ })).toBeVisible();
  await page.getByRole('button', { name: /02 Love letter/ }).click();
  await expect(page.getByRole('heading', { name: 'The things I never sent' })).toBeVisible();
  await page.getByRole('button', { name: /X-RAY/ }).click();
  await page.getByLabel('Explore a decision').selectOption('emotional_intensity');
  await expect(page.getByText(/Stronger emotion increases/)).toBeVisible();
  await page.getByRole('button', { name: 'Close X-RAY' }).click();
  await page.getByRole('button', { name: /Compare/ }).click();
  await page.getByLabel('Source B').selectOption('product');
  await page.getByLabel('Blend between A and B').fill('0.8');
  await expect(page.getByText('80% toward B')).toBeVisible();
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(page.getByRole('button', { name: 'Motion off' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unavailable analysis retains the previous fingerprint and explains recovery', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Make a fingerprint/ }).click();
  await page
    .getByLabel('Text to analyze')
    .fill(
      'This is a sufficiently long example paragraph about building a thoughtful interface with clear and accessible controls.',
    );
  await page.getByRole('button', { name: /Find its fingerprint/ }).click();
  await expect(page.getByRole('alert')).toContainText('Live analysis');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('heading', { name: 'A protocol for remembering' })).toBeVisible();
});

test('reduced motion and accessible DOM work without relying on a canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Motion off' })).toBeDisabled();
  await page.getByRole('button', { name: /X-RAY/ }).click();
  await expect(page.getByRole('heading', { name: 'Why this shape?' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('malformed successful API responses fail safely', async ({ page }) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({ json: { result: { answers: {} } } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Make a fingerprint/ }).click();
  await page
    .getByLabel('Text to analyze')
    .fill(
      'Here is an example paragraph that is long enough for the validation rules and should trigger our response handling.',
    );
  await page.getByRole('button', { name: /Find its fingerprint/ }).click();
  await expect(page.getByRole('alert')).toContainText('incomplete');
});

test('a validated text reading replaces the example and closes the dialog', async ({ page }) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      json: {
        ...examples[0],
        id: 'test-live',
        title: 'A new reading',
        provenance: 'live',
        sourceType: 'text',
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Make a fingerprint/ }).click();
  await page
    .getByLabel('Text to analyze')
    .fill(
      'This is an original paragraph about evaluating an interface. Every visible choice should have a clear explanation and a predictable effect.',
    );
  await page.getByRole('button', { name: /Find its fingerprint/ }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'A new reading' })).toBeVisible();
});

test('URL errors offer pasted-text recovery', async ({ page }) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      status: 502,
      json: {
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'We couldn’t read this page. Paste its text instead.',
        },
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Make a fingerprint/ }).click();
  await page.getByRole('button', { name: 'Webpage URL' }).click();
  await page
    .getByLabel('Webpage URL', { exact: true })
    .fill('https://developers.cloudflare.com/workers/');
  await page.getByRole('button', { name: /Find its fingerprint/ }).click();
  await expect(page.getByRole('alert')).toContainText('Paste its text');
  await page.getByRole('button', { name: 'Paste text' }).click();
  await expect(page.getByLabel('Text to analyze')).toBeVisible();
});

test('WebGL failure retains a semantic still and accessible decisions', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByText('Static view · Every decision is available in X-RAY.')).toBeVisible();
  await page.getByRole('button', { name: /X-RAY/ }).click();
  await expect(page.getByRole('heading', { name: 'Why this shape?' })).toBeVisible();
});

test('API rejects foreign origins and never caches disabled analysis', async ({ request }) => {
  const rejected = await request.post('/api/analyze', {
    headers: { Origin: 'https://unrelated.example' },
    data: { sourceType: 'text', text: 'Test' },
  });
  expect(rejected.status()).toBe(403);
  const disabled = await request.post('/api/analyze', {
    data: { sourceType: 'text', text: 'Test' },
  });
  expect(disabled.status()).toBe(503);
  expect(disabled.headers()['cache-control']).toBe('no-store');
  expect((await request.get('/api/analyze')).status()).toBe(405);
});

test('drag rotation works after changing the motion setting', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.canvas-wrap canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const before = await canvas.screenshot();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Missing canvas bounds');
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 40, { steps: 12 });
  await page.mouse.up();
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
});
