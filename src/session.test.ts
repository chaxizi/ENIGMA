import { describe, expect, it } from 'vitest';
import { initialSession, sessionReducer } from './session';
import { DEFAULT_CONFIG } from './core/enigma';

describe('session actions', () => {
  it('refuses overflow and preserves last accepted text', () => {
    const state = sessionReducer(initialSession, { type: 'message', value: 'hello' });
    const next = sessionReducer(state, { type: 'message', value: 'x'.repeat(10001) });
    expect(next.message).toBe('HELLO'); expect(next.error).toMatch(/10,000/);
  });
  it('applies only valid drafts and never clears the message', () => {
    const config = { ...DEFAULT_CONFIG, rings: [1, 2, 3] as const };
    const start = { ...initialSession, message: 'HELLO', draft: config };
    expect(sessionReducer(start, { type: 'apply' })).toMatchObject({ applied: config, message: 'HELLO' });
    const invalid = { ...start, draft: { ...config, rotors: ['I', 'I', 'III'] as const } };
    expect(sessionReducer(invalid, { type: 'apply' }).applied).toEqual(DEFAULT_CONFIG);
  });
  it('clear retains configuration, reset clears configuration and draft', () => {
    const config = { ...DEFAULT_CONFIG, rings: [1, 2, 3] as const };
    const state = { ...initialSession, applied: config, draft: config, message: 'ABC' };
    expect(sessionReducer(state, { type: 'clear' })).toMatchObject({ message: '', applied: config, draft: config });
    expect(sessionReducer(state, { type: 'reset' })).toMatchObject({ message: '', applied: DEFAULT_CONFIG, draft: DEFAULT_CONFIG });
  });
});
