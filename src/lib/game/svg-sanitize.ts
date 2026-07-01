// src/lib/game/svg-sanitize.ts — bersihkan SVG dari elemen/atribut berbahaya (XSS)
// Dipakai di klien (butuh DOMParser). Dipanggil saat admin upload DAN saat render (defense in depth).
export function sanitizeSvg(raw: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  let doc: Document;
  try { doc = new DOMParser().parseFromString(raw, 'image/svg+xml'); } catch { return ''; }
  const svg = doc.querySelector('svg');
  if (!svg) return '';
  // buang elemen berbahaya/aktif
  svg.querySelectorAll('script,foreignObject,style,iframe,image,animate,animatetransform,set,use,a').forEach((e) => e.remove());
  // buang atribut event handler & referensi eksternal berbahaya
  const bersihkan = (el: Element) => {
    [...el.attributes].forEach((a) => {
      const n = a.name.toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(a.name);
      else if (n === 'href' || n === 'xlink:href') el.removeAttribute(a.name);
      else if (n === 'style' && /url\(|expression|javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
  };
  bersihkan(svg);
  svg.querySelectorAll('*').forEach(bersihkan);
  return svg.outerHTML;
}

/** Hitung jumlah bentuk yang bisa diwarnai dalam sebuah SVG (untuk info admin). */
export function hitungArea(svg: string): number {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return 0;
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return doc.querySelectorAll('path,rect,circle,ellipse,polygon').length;
  } catch { return 0; }
}
