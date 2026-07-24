// src/lib/share.ts — util pembentuk URL berbagi ke sosial media (murni, teruji unit).
export type ShareTarget = 'whatsapp' | 'facebook' | 'twitter' | 'telegram';

export function tautanShare(target: ShareTarget, opts: { url: string; text?: string }): string {
  const u = encodeURIComponent(opts.url);
  const t = encodeURIComponent(opts.text ?? '');
  switch (target) {
    case 'whatsapp': return t ? `https://wa.me/?text=${t}%20${u}` : `https://wa.me/?text=${u}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'twitter': return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'telegram': return `https://t.me/share/url?url=${u}&text=${t}`;
  }
}

// Tambah parameter UTM share ke sebuah URL (murni). jenis: 'artikel'|'kelas'|'game'.
export function denganUtm(url: string, opts: { medium: string; jenis: string }): string {
  const sep = url.includes('?') ? '&' : '?';
  const q = `utm_source=share&utm_medium=${encodeURIComponent(opts.medium)}&utm_content=${encodeURIComponent(opts.jenis)}`;
  return `${url}${sep}${q}`;
}
