// src/lib/kartu-bersama.ts — bagian bersama kartu berbagi (Story 1080×1920 & Feed 1080×1080).
// Palet, pembungkus teks, pemuat aset, primitif gambar, dan ornamen. Tanpa dependency.
'use client';

export const KRIM = '#FBF7EE';
export const NAVY = '#123A5C';
export const TEAL = '#1E7F6F';
export const KUNING = '#F6C445';
export const PERI = '#A9BEE6';   // biru lembut
export const BIRU_MUDA = '#E9EFF8';

/** Cukup untuk mengukur teks — dibuat minimal supaya logikanya bisa diuji tanpa canvas. */
export interface PengukurTeks {
  font: string;
  measureText(teks: string): { width: number };
}

/** Pecah teks jadi baris berdasar batas KARAKTER (per kata; kata > maks tetap satu baris). Murni & teruji. */
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

/** Pecah teks berdasar LEBAR terukur. Melebihi `maksBaris` → baris terakhir dipotong dengan "…". */
export function bungkusUkur(ctx: PengukurTeks, teks: string, maksLebar: number, maksBaris = 4): string[] {
  const kata = (teks ?? '').trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return [];
  const baris: string[] = [];
  let cur = '';
  for (const w of kata) {
    const coba = cur ? cur + ' ' + w : w;
    if (ctx.measureText(coba).width <= maksLebar || !cur) cur = coba;
    else { baris.push(cur); cur = w; }
  }
  if (cur) baris.push(cur);
  if (baris.length <= maksBaris) return baris;
  const potong = baris.slice(0, maksBaris);
  potong[maksBaris - 1] = potong[maksBaris - 1].replace(/[.,;:]$/, '') + '…';
  return potong;
}

/**
 * Cari ukuran font TERBESAR yang benar-benar muat: jumlah baris ≤ `maksBaris` DAN
 * setiap baris ≤ `maksLebar`. Ini yang menjamin judul sepanjang apa pun tidak terpotong
 * atau melewati tepi kanvas — `bungkusUkur` saja tidak cukup, karena satu kata yang
 * lebih lebar dari kolom tetap dipaksa jadi satu baris (dan akan menjorok keluar).
 */
export function ukuranPas(
  ctx: PengukurTeks,
  teks: string,
  maksLebar: number,
  maksBaris: number,
  font: (px: number) => string,
  pxAwal: number,
  pxMin: number,
): { px: number; baris: string[] } {
  for (let px = pxAwal; px >= pxMin; px -= 2) {
    ctx.font = font(px);
    const baris = bungkusUkur(ctx, teks, maksLebar, 99);
    if (baris.length <= maksBaris && baris.every((b) => ctx.measureText(b).width <= maksLebar)) {
      return { px, baris };
    }
  }
  // Sudah sekecil batas bawah: pakai itu dan potong dengan "…" agar tetap tidak melimpah.
  ctx.font = font(pxMin);
  return { px: pxMin, baris: bungkusUkur(ctx, teks, maksLebar, maksBaris) };
}

export function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('gagal muat gambar'));
    img.src = src;
  });
}

/** Nama family font brand (next/font menghasilkan nama ter-hash → dibaca dari variabel CSS). */
export function keluarga(varCss: string, cadangan: string): string {
  if (typeof document === 'undefined') return cadangan;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varCss).trim();
  return v ? `${v}, ${cadangan}` : cadangan;
}

/** Tunggu font brand siap. Gagal → pemanggil tetap lanjut dengan fallback system-ui. */
export async function siapkanFont(fJudul: string, fTeks: string) {
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 110px ${fJudul}`),
      document.fonts.load(`700 46px ${fTeks}`),
      document.fonts.load(`600 40px ${fTeks}`),
    ]);
  } catch { /* fallback system-ui */ }
}

export function jalurKotakBulat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Gambar `img` menutupi kotak (object-fit: cover) dengan sudut membulat.
 * `fokusY` 0..1 = titik fokus vertikal saat foto harus dipangkas (0 = tepi atas,
 * 0,5 = tengah, 1 = tepi bawah). Untuk kotak PORTRAIT dengan sumber landscape,
 * nilai < 0,5 penting: wajah anak hampir selalu di bagian atas foto, dan crop
 * tengah memenggalnya.
 */
export function gambarCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number, fokusY = 0.5) {
  ctx.save();
  jalurKotakBulat(ctx, x, y, w, h, r);
  ctx.clip();
  const ar = img.width / img.height, arBox = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ar > arBox) { sw = img.height * arBox; sx = (img.width - sw) / 2; }
  else { sh = img.width / arBox; sy = (img.height - sh) * Math.min(1, Math.max(0, fokusY)); }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

/**
 * Gambar `img` UTUH di dalam kotak (object-fit: contain) — tidak ada bagian yang dipotong.
 * Dipakai bila isi gambarnya penting sampai ke tepi, mis. sampul artikel yang memuat
 * TULISAN: memotongnya akan memenggal kata. Mengembalikan kotak nyata gambar setelah
 * diskalakan, supaya pemanggil bisa menempatkan bingkai/bayangan tepat di situ.
 */
export function gambarMuat(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  jalurKotakBulat(ctx, dx, dy, dw, dh, Math.min(r, dw / 2, dh / 2));
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return { x: dx, y: dy, w: dw, h: dh };
}

export function bayangan(ctx: CanvasRenderingContext2D, blur: number, dy: number, warna = 'rgba(18,58,92,.14)') {
  ctx.shadowColor = warna; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy;
}

// ── Ornamen ────────────────────────────────────────────────────────────────
export function busurPutus(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, warna: string) {
  ctx.save();
  ctx.setLineDash([16, 18]); ctx.lineWidth = 5; ctx.strokeStyle = warna; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.restore();
}
export function kilau(ctx: CanvasRenderingContext2D, cx: number, cy: number, p: number, warna: string) {
  ctx.save();
  ctx.strokeStyle = warna; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (-Math.PI / 2) + (i - 1) * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * p * 0.45, cy + Math.sin(a) * p * 0.45);
    ctx.lineTo(cx + Math.cos(a) * p, cy + Math.sin(a) * p);
    ctx.stroke();
  }
  ctx.restore();
}
export function bintangGaris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, warna: string) {
  ctx.save();
  ctx.strokeStyle = warna; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const a2 = a1 + Math.PI / 5;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}
export function hatiGaris(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, warna: string) {
  ctx.save();
  ctx.strokeStyle = warna; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.7);
  ctx.bezierCurveTo(cx - s * 1.3, cy - s * 0.2, cx - s * 0.5, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.1, cx + s * 1.3, cy - s * 0.2, cx, cy + s * 0.7);
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

/** Isi kartu — sama persis untuk Story maupun Feed. */
export interface IsiKartu {
  judul: string;
  subjudul?: string;      // ringkasan / teks pendukung di bawah judul
  labelKartu: string;     // label kecil, mis. "ARTIKEL KIDZPLAYFUL"
  ajakan?: string;        // teks tombol CTA
  gambar?: string;        // foto utama (sampul)
}
