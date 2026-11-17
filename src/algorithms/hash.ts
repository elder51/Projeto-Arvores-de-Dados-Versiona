/** Gera um hash djb2 de 32 bits para comparação simples, não criptográfica. */
export function makeHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = (((hash << 5) + hash) + text.charCodeAt(i)) >>> 0;
  const digits = "0123456789abcdef";
  let hex = "";
  let value = hash;
  for (let i = 0; i < 8; i += 1) {
    hex = digits[value & 15] + hex;
    value >>>= 4;
  }
  return hex;
}
