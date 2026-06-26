// src/lib/game/aset.ts
export function isUrlAset(v: string): boolean {
  return /^https?:\/\//.test(v) || v.startsWith('/');
}
