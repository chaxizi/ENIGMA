import { ALPHABET, REFLECTOR_B, ROTOR_IDS, ROTORS, type RotorId } from './catalog';

export type Positions = readonly [number, number, number];
export type PlugPair = readonly [string, string];
export interface EnigmaConfig {
  readonly model: 'Enigma I';
  readonly rotors: readonly [RotorId, RotorId, RotorId];
  readonly rings: Positions;
  readonly initialPositions: Positions;
  readonly reflector: 'B';
  readonly plugboard: readonly PlugPair[];
}
export interface ConfigError { field: string; message: string }
export type ConfigValidation =
  | { valid: true; config: EnigmaConfig }
  | { valid: false; errors: ConfigError[] };
export interface MessageResult {
  normalizedMessage: string;
  output: string;
  finalPositions: Positions;
  processedCount: number;
  lastOutput: string | null;
}

export const MAX_MESSAGE_LENGTH = 10_000;
export const DEFAULT_CONFIG: EnigmaConfig = Object.freeze({
  model: 'Enigma I',
  rotors: Object.freeze(['I', 'II', 'III'] as const),
  rings: Object.freeze([0, 0, 0] as const),
  initialPositions: Object.freeze([0, 0, 0] as const),
  reflector: 'B',
  plugboard: Object.freeze([]),
});

export function validateConfig(input: unknown): ConfigValidation {
  const errors: ConfigError[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'config', message: '机器配置无效。' }] };
  }
  const c = input as Record<string, unknown>;
  if (c.model !== 'Enigma I') errors.push({ field: 'model', message: '仅支持 Enigma I。' });
  if (c.reflector !== 'B') errors.push({ field: 'reflector', message: '反射器必须为 B。' });
  if (!Array.isArray(c.rotors) || c.rotors.length !== 3 || Array.from(c.rotors).some(r => !ROTOR_IDS.includes(r))) {
    errors.push({ field: 'rotors', message: '请选择三个有效转子（I–V）。' });
  } else if (new Set(c.rotors).size !== 3) {
    errors.push({ field: 'rotors', message: '三个转子不能重复。' });
  }
  for (const [field, label] of [['rings', '环位'], ['initialPositions', '初始位置']] as const) {
    const values = c[field];
    if (!Array.isArray(values) || values.length !== 3 || Array.from(values).some(n => !Number.isInteger(n) || n < 0 || n > 25)) {
      errors.push({ field, message: `${label}必须为三个 0–25 的整数。` });
    }
  }
  if (!Array.isArray(c.plugboard)) {
    errors.push({ field: 'plugboard', message: '插线板配置无效。' });
  } else {
    if (c.plugboard.length > 10) errors.push({ field: 'plugboard', message: '本版本最多支持十对插线。' });
    const used = new Set<string>();
    for (const pair of c.plugboard) {
      if (!Array.isArray(pair) || pair.length !== 2 || Array.from(pair).some(letter => typeof letter !== 'string' || !/^[A-Z]$/.test(letter))) {
        errors.push({ field: 'plugboard', message: '每对插线必须包含两个 A–Z 字母。' });
        continue;
      }
      const [a, b] = pair as [string, string];
      if (a === b) errors.push({ field: 'plugboard', message: '一个字母不能与自身连接。' });
      if (used.has(a) || used.has(b)) errors.push({ field: 'plugboard', message: '每个字母只能用于一对插线。' });
      used.add(a); used.add(b);
    }
  }
  return errors.length ? { valid: false, errors } : { valid: true, config: input as EnigmaConfig };
}

export class EnigmaError extends Error {
  constructor(message: string) { super(message); this.name = 'EnigmaError'; }
}

function assertConfig(config: EnigmaConfig) {
  const result = validateConfig(config);
  if (!result.valid) throw new EnigmaError(result.errors.map(e => e.message).join(' '));
}
function assertPositions(p: Positions) {
  if (!Array.isArray(p) || p.length !== 3 || Array.from(p).some(n => !Number.isInteger(n) || n < 0 || n > 25)) {
    throw new EnigmaError('转子位置必须为三个 0–25 的整数。');
  }
}
const mod = (n: number) => ((n % 26) + 26) % 26;

function advance(config: EnigmaConfig, p: Positions): Positions {
  const middleAtNotch = p[1] === ROTORS[config.rotors[1]].turnover;
  const rightAtNotch = p[2] === ROTORS[config.rotors[2]].turnover;
  return [
    mod(p[0] + Number(middleAtNotch)),
    mod(p[1] + Number(middleAtNotch || rightAtNotch)),
    mod(p[2] + 1),
  ];
}

export function stepRotors(config: EnigmaConfig, positions: Positions): Positions {
  assertConfig(config); assertPositions(positions);
  return advance(config, positions);
}

function compile(config: EnigmaConfig) {
  assertConfig(config);
  const plugs = Array.from({ length: 26 }, (_, i) => i);
  for (const [a, b] of config.plugboard) {
    const x = ALPHABET.indexOf(a), y = ALPHABET.indexOf(b);
    plugs[x] = y; plugs[y] = x;
  }
  const rotors = config.rotors.map(id => ROTORS[id]);
  return (input: number, positions: Positions) => {
    let value = plugs[input];
    for (let i = 2; i >= 0; i--) {
      const offset = positions[i] - config.rings[i];
      value = mod(rotors[i].forward[mod(value + offset)] - offset);
    }
    value = REFLECTOR_B[value];
    for (let i = 0; i < 3; i++) {
      const offset = positions[i] - config.rings[i];
      value = mod(rotors[i].reverse[mod(value + offset)] - offset);
    }
    return ALPHABET[plugs[value]];
  };
}

/** Steps BEFORE passing current through the machine. Does not mutate arguments. */
export function encodeLetter(config: EnigmaConfig, positions: Positions, letter: string) {
  if (!/^[A-Z]$/.test(letter)) throw new EnigmaError('请输入单个 A–Z 字母。');
  assertPositions(positions);
  const transform = compile(config);
  const nextPositions = advance(config, positions);
  return { output: transform(ALPHABET.indexOf(letter), nextPositions), positions: nextPositions };
}

export function processMessage(config: EnigmaConfig, message: string): MessageResult {
  if (typeof message !== 'string') throw new EnigmaError('消息必须是文字。');
  if (message.length > MAX_MESSAGE_LENGTH) throw new EnigmaError('消息超过 10,000 个 UTF-16 单元，请缩短后重试。');
  const transform = compile(config);
  const normalizedMessage = message.replace(/[a-z]/g, c => c.toUpperCase());
  let positions: Positions = [...config.initialPositions];
  let processedCount = 0;
  let lastOutput: string | null = null;
  const output: string[] = [];
  for (const letter of normalizedMessage) {
    const code = letter.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      positions = advance(config, positions);
      lastOutput = transform(code - 65, positions);
      output.push(lastOutput);
      processedCount++;
    } else output.push(letter);
  }
  return { normalizedMessage, output: output.join(''), finalPositions: positions, processedCount, lastOutput };
}

export const displayPositions = (positions: Positions) => positions.map(n => ALPHABET[n]).join('');
