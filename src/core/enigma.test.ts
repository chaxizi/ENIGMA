import { describe, expect, it } from 'vitest';
import { ALPHABET, REFLECTOR_B, ROTORS } from './catalog';
import { DEFAULT_CONFIG, displayPositions, encodeLetter, processMessage, stepRotors, validateConfig, type EnigmaConfig, type Positions } from './enigma';

// Fixed expected values from https://py-enigma.readthedocs.io/en/latest/guide.html
const historical: EnigmaConfig = {
  model: 'Enigma I', rotors: ['II', 'IV', 'V'], rings: [1, 20, 11],
  initialPositions: [22, 23, 2], reflector: 'B',
  plugboard: 'AV BS CG DL FU HZ IN KM OW RX'.split(' ').map(pair => [pair[0], pair[1]]),
};
const positions = (text: string) => [...text].map(letter => ALPHABET.indexOf(letter)) as unknown as Positions;

describe('historically verified machine behavior', () => {
  it('matches the message-key vector in both directions', () => {
    expect(processMessage(historical, 'BLA').output).toBe('KCH');
    expect(processMessage(historical, 'KCH').output).toBe('BLA');
  });
  it('matches the non-default rings and ten-pair message vector in both directions', () => {
    const config = { ...historical, initialPositions: positions('BLA') };
    expect(processMessage(config, 'THEXRUSSIANSXAREXCOMINGX').output).toBe('NIBLFMYMLLUFWCASCSSNVHAZ');
    expect(processMessage(config, 'NIBLFMYMLLUFWCASCSSNVHAZ').output).toBe('THEXRUSSIANSXAREXCOMINGX');
  });
  it('steps before encoding, including the first key', () => {
    expect(encodeLetter(DEFAULT_CONFIG, [0, 0, 0], 'A')).toEqual({ output: 'B', positions: [0, 0, 1] });
    expect(processMessage(DEFAULT_CONFIG, 'AAAAA').output).toBe('BDZGO');
  });
  it('double steps the middle rotor: ADU → ADV → AEW → BFX', () => {
    let p = positions('ADU');
    const sequence = [];
    for (let n = 0; n < 3; n++) { p = stepRotors(DEFAULT_CONFIG, p); sequence.push(displayPositions(p)); }
    expect(sequence).toEqual(['ADV', 'AEW', 'BFX']);
  });
  it('does not shift window turnover letters with rings', () => {
    const config = { ...DEFAULT_CONFIG, rings: [4, 11, 23] as const };
    expect(displayPositions(stepRotors(config, positions('ADV')))).toBe('AEW');
    expect(displayPositions(stepRotors(config, positions('AEW')))).toBe('BFX');
  });
  it('steps the middle rotor only once when both notch conditions are true', () => {
    expect(displayPositions(stepRotors(DEFAULT_CONFIG, positions('AEV')))).toBe('BFW');
  });
  it('wraps Z to A and supports V turnover at Z', () => {
    expect(displayPositions(stepRotors(DEFAULT_CONFIG, positions('AAZ')))).toBe('AAA');
    expect(displayPositions(stepRotors({ ...DEFAULT_CONFIG, rotors: ['I', 'II', 'V'] }, positions('AAZ')))).toBe('ABA');
  });
});

describe('wiring invariants and state isolation', () => {
  it('has reversible permutations and a symmetric, fixed-point-free reflector', () => {
    for (const rotor of Object.values(ROTORS)) {
      expect(new Set(rotor.forward).size).toBe(26);
      for (let n = 0; n < 26; n++) expect(rotor.reverse[rotor.forward[n]]).toBe(n);
    }
    for (let n = 0; n < 26; n++) { expect(REFLECTOR_B[n]).not.toBe(n); expect(REFLECTOR_B[REFLECTOR_B[n]]).toBe(n); }
  });
  it('never encodes a letter to itself with non-default settings', () => {
    for (const config of [DEFAULT_CONFIG, historical, { ...historical, rotors: ['V', 'III', 'I'] as const }]) {
      const text = ALPHABET.repeat(30);
      const output = processMessage(config, text).output;
      expect([...output].every((letter, n) => letter !== text[n])).toBe(true);
      expect(processMessage(config, output).output).toBe(text);
    }
  });
  it('is deterministic and never mutates its arguments', () => {
    const before = JSON.stringify(historical);
    const p = Object.freeze([22, 23, 2] as const);
    expect(processMessage(historical, 'BLA')).toEqual(processMessage(historical, 'BLA'));
    stepRotors(historical, p); encodeLetter(historical, p, 'A');
    expect(p).toEqual([22, 23, 2]); expect(JSON.stringify(historical)).toBe(before);
    expect(DEFAULT_CONFIG.initialPositions).toEqual([0, 0, 0]);
  });
});

describe('text handling and invalid input', () => {
  it('only uppercases ASCII and leaves Unicode, emoji, whitespace, digits and punctuation untouched', () => {
    const mixed = processMessage(DEFAULT_CONFIG, 'a 中ßé🙂 12\n!a');
    expect(mixed.normalizedMessage).toBe('A 中ßé🙂 12\n!A');
    expect(mixed.output).toBe('B 中ßé🙂 12\n!D');
    expect(mixed.processedCount).toBe(2); expect(mixed.lastOutput).toBe('D');
    expect(mixed.finalPositions).toEqual([0, 0, 2]);
  });
  it('returns the initial state for empty/nonalphabetic input', () => {
    for (const text of ['', '中文🙂 123!']) {
      const result = processMessage(historical, text);
      expect(result.output).toBe(text); expect(result.processedCount).toBe(0);
      expect(result.finalPositions).toEqual(historical.initialPositions); expect(result.lastOutput).toBeNull();
    }
  });
  it('handles 10,000 UTF-16 units and rejects overflow without truncation', () => {
    expect(processMessage(DEFAULT_CONFIG, '🙂'.repeat(5000)).output.length).toBe(10000);
    expect(() => processMessage(DEFAULT_CONFIG, 'a'.repeat(10001))).toThrow(/10,000/);
  });
  it.each([
    null, {}, { ...DEFAULT_CONFIG, model: 'M4' }, { ...DEFAULT_CONFIG, reflector: 'C' },
    { ...DEFAULT_CONFIG, rotors: ['I', 'I', 'III'] }, { ...DEFAULT_CONFIG, rotors: ['I', 'II', 'VI'] },
    { ...DEFAULT_CONFIG, rings: [0, -1, 26] }, { ...DEFAULT_CONFIG, initialPositions: [0, 0.5, 1] },
    { ...DEFAULT_CONFIG, rings: new Array(3) }, { ...DEFAULT_CONFIG, rotors: Object.assign(new Array(3), { 0: 'I', 1: 'II' }) },
    { ...DEFAULT_CONFIG, plugboard: [['A', 'A']] }, { ...DEFAULT_CONFIG, plugboard: [['A', 'B'], ['B', 'C']] },
    { ...DEFAULT_CONFIG, plugboard: [['a', 'B']] }, { ...DEFAULT_CONFIG, plugboard: 'AB' },
    { ...DEFAULT_CONFIG, plugboard: Array.from({ length: 11 }, (_, n) => [ALPHABET[n * 2], ALPHABET[n * 2 + 1]]) },
  ])('rejects invalid configuration %# with structured errors', config => {
    const validation = validateConfig(config);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.length).toBeGreaterThan(0);
  });
  it('rejects invalid single letters and invalid positions', () => {
    for (const letter of ['a', '', 'AB', '中']) expect(() => encodeLetter(DEFAULT_CONFIG, [0, 0, 0], letter)).toThrow();
    expect(() => stepRotors(DEFAULT_CONFIG, [0, 0, 26])).toThrow();
    expect(() => processMessage({ ...DEFAULT_CONFIG, rotors: ['I', 'I', 'III'] }, 'A')).toThrow();
  });
});
