/** Historical wiring and window turnover letters, viewed from right (ETW) to left.
 * Source: https://www.cryptomuseum.com/crypto/enigma/wiring.htm
 * Window turnover letters are Q/E/V/J/Z, not the physical notch column Y/M/D/R/H.
 */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ROTOR_IDS = ['I', 'II', 'III', 'IV', 'V'] as const;
export type RotorId = (typeof ROTOR_IDS)[number];

function makeRotor(wiring: string, turnover: string) {
  const forward = [...wiring].map(letter => ALPHABET.indexOf(letter));
  const reverse = new Array<number>(26);
  forward.forEach((destination, origin) => { reverse[destination] = origin; });
  return Object.freeze({
    wiring,
    forward: Object.freeze(forward),
    reverse: Object.freeze(reverse),
    turnover: ALPHABET.indexOf(turnover),
  });
}

export const ROTORS = Object.freeze({
  I: makeRotor('EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'),
  II: makeRotor('AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'),
  III: makeRotor('BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'),
  IV: makeRotor('ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'),
  V: makeRotor('VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'),
});

export const REFLECTOR_B = Object.freeze(
  [...'YRUHQSLDPXNGOKMIEBFZCWVJAT'].map(letter => ALPHABET.indexOf(letter)),
);
