// src/lib/ref.ts — atribusi first-touch dari share (disimpan di localStorage 'kp_ref').
export interface Ref { saluran: string; jenis: string }
const KUNCI = 'kp_ref';
const MAKS_MS = 30 * 24 * 3600 * 1000; // first-touch berlaku 30 hari

/** Inti murni: parse & validasi raw localStorage. `sekarang` = Date.now(). */
export function parseRef(raw: string | null, sekarang: number): Ref | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { saluran?: unknown; jenis?: unknown; ts?: unknown };
    if (typeof o?.ts !== 'number' || sekarang - o.ts > MAKS_MS) return null;
    return { saluran: String(o.saluran || 'native'), jenis: String(o.jenis || '') };
  } catch { return null; }
}

/** Baca ref valid dari localStorage (client). */
export function bacaRef(): Ref | null {
  if (typeof window === 'undefined') return null;
  return parseRef(window.localStorage.getItem(KUNCI), Date.now());
}

/** First-touch: simpan ref dari query URL bila utm_source=share & belum ada ref valid. */
export function simpanRefDariUrl(sp: URLSearchParams): void {
  if (typeof window === 'undefined') return;
  if (sp.get('utm_source') !== 'share') return;
  if (parseRef(window.localStorage.getItem(KUNCI), Date.now())) return; // sudah ada (first-touch menang)
  const data = { saluran: sp.get('utm_medium') || 'native', jenis: sp.get('utm_content') || '', ts: Date.now() };
  try { window.localStorage.setItem(KUNCI, JSON.stringify(data)); } catch { /* storage penuh/diblokir */ }
}

export function hapusRef(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KUNCI); } catch { /* abaikan */ }
}
