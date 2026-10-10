export const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''));

export const fromBase64 = (value: string) => {
  try {
    return Uint8Array.from(atob(value), (character) => character.codePointAt(0) ?? 0);
  } catch {
    return new Uint8Array();
  }
};
