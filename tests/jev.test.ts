import { describe, expect, it, vi } from 'vitest';
import { analyzeText, type JevRun } from '../worker/jev';
import { examples } from '../src/fixtures/examples';

describe('Jev adapter', () => {
  it('unwraps actual binding results, disables persistence options, and reports the returned model', async () => {
    const run = vi
      .fn<JevRun>()
      .mockResolvedValue({ state: 'complete', result: examples[0].result });
    const analysis = await analyzeText('A public example.', { run }, 'jevprint');
    expect(analysis.result.model).toBe('jev-1.13.0');
    expect(analysis.provenance).toBe('live');
    expect(run).toHaveBeenCalledExactlyOnceWith(
      'typesafe/jev',
      expect.objectContaining({ state: { source_type: 'text', content: 'A public example.' } }),
      expect.objectContaining({
        gateway: expect.objectContaining({ collectLog: false, skipCache: true, id: 'jevprint' }),
      }),
    );
  });
  it('does not retry an ambiguous provider failure or expose its message', async () => {
    const run = vi.fn<JevRun>().mockRejectedValue(new Error('PRIVATE CONTENT in upstream error'));
    await expect(analyzeText('Test', { run }, 'jevprint')).rejects.toThrow('Jev is unavailable');
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('rejects missing answers without inventing a fingerprint', async () => {
    const run = vi.fn<JevRun>().mockResolvedValue({ model: 'jev', answers: {} });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await expect(analyzeText('Test', { run }, 'jevprint')).rejects.toThrow('incomplete reading');
    } finally {
      spy.mockRestore();
    }
  });
});
