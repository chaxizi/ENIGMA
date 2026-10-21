// @vitest-environment node
import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { DEFAULT_CONFIG, processMessage } from './enigma';

it('processes 10,000 English letters in under 100ms on the recorded machine', () => {
  const message = 'A'.repeat(10000);
  processMessage(DEFAULT_CONFIG, message);
  const start = performance.now();
  const result = processMessage(DEFAULT_CONFIG, message);
  const elapsed = performance.now() - start;
  console.info(JSON.stringify({ characters: 10000, elapsedMs: Number(elapsed.toFixed(3)) }));
  expect(result.processedCount).toBe(10000);
  expect(elapsed).toBeLessThan(100);
});
