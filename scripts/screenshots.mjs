import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('canvas').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true });
  await page.getByRole('button', { name: /02 Love letter/ }).click();
  await page.screenshot({ path: 'docs/screenshots/letter.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
} finally {
  await browser.close();
}
