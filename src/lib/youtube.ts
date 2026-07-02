// src/lib/youtube.ts — util murni ekstraksi ID YouTube (dipakai komponen/halaman)
export function youtubeId(s: string | null | undefined): string | null {
  const t = (s ?? '').trim();
  if (!t) return null;
  if (/^[\w-]{11}$/.test(t)) return t; // ID mentah 11 karakter
  const m = t.match(/(?:v=|vi=|youtu\.be\/|embed\/|shorts\/|live\/|\/v\/)([\w-]{11})/);
  if (m) return m[1];
  if (/youtube\.com|youtu\.be/i.test(t)) {
    const any = t.match(/[\w-]{11}/);
    if (any) return any[0];
  }
  return null;
}
