// src/lib/story-card.ts — buat kartu gambar Story (1080x1920) via canvas untuk dibagikan ke IG Story.
'use client';

/** Pecah teks jadi baris berdasar batas karakter (per kata; kata > maks tetap satu baris). Murni & teruji. */
export function bungkusTeks(teks: string, maks: number): string[] {
  const kata = (teks ?? '').trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return [];
  const baris: string[] = [];
  let cur = '';
  for (const w of kata) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maks) cur += ' ' + w;
    else { baris.push(cur); cur = w; }
  }
  if (cur) baris.push(cur);
  return baris;
}

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('gagal muat gambar'));
    img.src = src;
  });
}

// gambar bulat-sudut area (cover) — dipakai untuk gambar konten
function gambarCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
  const ar = img.width / img.height, arBox = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ar > arBox) { sw = img.height * arBox; sx = (img.width - sw) / 2; }
  else { sh = img.width / arBox; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export async function buatKartuStory(opts: {
  judul: string; jenisLabel: string; ajakan: string; gambar?: string; urlTeks: string;
}): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  // latar gradient brand
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#a892e6'); g.addColorStop(1, '#7cc7f5');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // wordmark brand
  ctx.fillStyle = '#fff';
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.fillText('🎈 KidzPlayful', W / 2, 170);

  // gambar konten (opsional) → kartu putih di tengah atas
  const boxX = 120, boxY = 260, boxW = W - 240, boxH = 760;
  if (opts.gambar) {
    try { gambarCover(ctx, await muatGambar(opts.gambar), boxX, boxY, boxW, boxH, 48); }
    catch { /* CORS/gagal → lewati gambar */ }
  }

  // panel teks bawah (semi transparan)
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, 1120, W, H - 1120);

  // label jenis
  ctx.fillStyle = '#fff8'; ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(opts.jenisLabel.toUpperCase(), W / 2, 1230);

  // judul (auto-wrap, maks 3 baris)
  ctx.fillStyle = '#fff'; ctx.font = '800 76px system-ui, sans-serif';
  const baris = bungkusTeks(opts.judul, 18).slice(0, 3);
  let y = 1330;
  for (const b of baris) { ctx.fillText(b, W / 2, y); y += 92; }

  // CTA
  ctx.fillStyle = '#fff'; ctx.font = '700 46px system-ui, sans-serif';
  ctx.fillText('✨ ' + opts.ajakan, W / 2, y + 70);

  // url teks
  ctx.fillStyle = '#ffffffcc'; ctx.font = '600 38px system-ui, sans-serif';
  ctx.fillText(opts.urlTeks, W / 2, H - 90);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/png'));
}
