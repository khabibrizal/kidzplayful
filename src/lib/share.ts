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
