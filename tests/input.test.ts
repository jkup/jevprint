import { describe, expect, it } from 'vitest';
import { MAX_REQUEST_BYTES, normalizeText, readBounded, validateText } from '../worker/input';

describe('input handling', () => {
  it('preserves paragraphs while normalizing whitespace and Unicode', () => {
    expect(normalizeText('  cafe\u0301  and\t tea\r\n\r\nNext.  ')).toBe('café and tea\n\nNext.');
  });
  it('rejects tiny and oversized content without silently truncating', () => {
    expect(() => validateText('hello')).toThrow(/few sentences/);
    expect(() => validateText('A long text '.repeat(1500))).toThrow(/not been truncated/);
    expect(() => validateText('你好这是很长的内容 '.repeat(1000))).toThrow(/12 KB/);
  });
  it('bounds streamed bodies even without Content-Length', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1));
        controller.close();
      },
    });
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: stream,
      headers: { 'Content-Type': 'application/json' },
      duplex: 'half',
    } as RequestInit);
    await expect(readBounded(req)).rejects.toThrow(/shorter excerpt/);
  });
  it('rejects malformed JSON and wrong content types', async () => {
    await expect(
      readBounded(
        new Request('http://localhost', {
          method: 'POST',
          body: '{',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ).rejects.toThrow(/could not be read/);
    await expect(
      readBounded(new Request('http://localhost', { method: 'POST', body: '{}' })),
    ).rejects.toThrow(/JSON/);
  });
});
