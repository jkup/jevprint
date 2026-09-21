import { describe, expect, it } from 'vitest';
import { browserAllowPattern, reduceContent, validateUrl } from '../worker/extract';

describe('URL pilot boundary', () => {
  it('sends an undelimited expression that matches only approved browser requests', () => {
    const allowed = new RegExp(browserAllowPattern);
    expect(allowed.test('https://developers.cloudflare.com/ai/models/typesafe/jev/')).toBe(true);
    expect(allowed.test('https://blog.cloudflare.com/assets/script.js')).toBe(true);
    expect(allowed.test('https://developers.cloudflare.com.evil.test/')).toBe(false);
    expect(allowed.test('https://127.0.0.1/')).toBe(false);
    expect(allowed.test('https://unrelated.test/redirect')).toBe(false);
  });
  it.each([
    'http://developers.cloudflare.com/',
    'https://localhost/',
    'https://127.0.0.1/',
    'https://[::1]/',
    'https://169.254.169.254/',
    'https://developers.cloudflare.com.evil.test/',
    'https://developers.cloudflare.com@evil.test/',
    'https://user:password@developers.cloudflare.com/',
    'https://developers.cloudflare.com:8080/',
    'file:///etc/passwd',
    'https://2130706433/',
    'https://evil.test/?url=https://developers.cloudflare.com/',
  ])('rejects %s before starting a browser', (url) => {
    expect(() => validateUrl(url)).toThrow();
  });
  it('permits only exact supported HTTPS hosts and removes fragments', () => {
    expect(validateUrl('https://developers.cloudflare.com/workers/#example').href).toBe(
      'https://developers.cloudflare.com/workers/',
    );
  });
});
describe('content reduction', () => {
  it('leaves short content intact', () => {
    expect(reduceContent('A short paragraph.')).toEqual({
      content: 'A short paragraph.',
      reduced: false,
      originalBytes: 18,
    });
  });
  it('keeps opening, ending, and representative middle within the byte budget', () => {
    const paragraphs = Array.from(
      { length: 100 },
      (_, i) => `Paragraph ${i}: ${'你好 world '.repeat(40)}`,
    );
    const input = paragraphs.join('\n\n');
    const reduced = reduceContent(input, 12000);
    expect(reduced).toEqual(reduceContent(input, 12000));
    expect(new TextEncoder().encode(reduced.content).length).toBeLessThanOrEqual(12000);
    expect(reduced.content).toContain('Paragraph 0:');
    expect(reduced.content).toContain('Paragraph 49:');
    expect(reduced.content).toContain('Paragraph 99:');
    expect(reduced.reduced).toBe(true);
  });
});
