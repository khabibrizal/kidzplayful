// src/lib/story-card.ts — kartu gambar Story (1080x1920) via canvas untuk dibagikan ke IG/WA Story.
// Gaya mengikuti desain kartu artikel KidzPlayful: latar krem, blob dekoratif, judul dua warna,
// foto besar, kartu pratinjau tautan, dan tombol ajakan. Tanpa dependency — murni canvas.
'use client';

const W = 1080, H = 1920;

const KRIM = '#FBF7EE';
const NAVY = '#123A5C';
const TEAL = '#1E7F6F';
const KUNING = '#F6C445';
const PERI = '#A9BEE6';   // biru lembut untuk blob kanan-atas

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

/** Pembungkus berbasis LEBAR terukur — dipakai canvas agar baris pas dengan lebar kolom. */
function bungkusUkur(ctx: CanvasRenderingContext2D, teks: string, maksLebar: number, maksBaris = 4): string[] {
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

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('gagal muat gambar'));
    img.src = src;
  });
}

/** Nama family font brand (next/font menghasilkan nama ter-hash → dibaca dari variabel CSS). */
function keluarga(varCss: string, cadangan: string): string {
  if (typeof document === 'undefined') return cadangan;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varCss).trim();
  return v ? `${v}, ${cadangan}` : cadangan;
}

function jalurKotakBulat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Gambar `img` menutupi kotak (object-fit: cover) dengan sudut membulat. */
function gambarCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  jalurKotakBulat(ctx, x, y, w, h, r);
  ctx.clip();
  const ar = img.width / img.height, arBox = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ar > arBox) { sw = img.height * arBox; sx = (img.width - sw) / 2; }
  else { sh = img.width / arBox; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function bayangan(ctx: CanvasRenderingContext2D, blur: number, dy: number, warna = 'rgba(18,58,92,.14)') {
  ctx.shadowColor = warna; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy;
}

// ── Ornamen ────────────────────────────────────────────────────────────────
function blobKananAtas(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PERI;
  ctx.beginPath();
  ctx.moveTo(1080, 0);
  ctx.bezierCurveTo(1080, 180, 1010, 300, 880, 300);
  ctx.bezierCurveTo(770, 300, 700, 210, 730, 120);
  ctx.bezierCurveTo(760, 30, 880, -20, 1080, 0);
  ctx.closePath();
  ctx.fill();
}
function blobKiriBawah(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = KUNING;
  ctx.beginPath();
  ctx.moveTo(0, 1450);
  ctx.bezierCurveTo(150, 1440, 300, 1520, 300, 1620);
  ctx.bezierCurveTo(300, 1720, 170, 1790, 0, 1780);
  ctx.closePath();
  ctx.fill();
}
function busurPutus(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, warna: string) {
  ctx.save();
  ctx.setLineDash([16, 18]); ctx.lineWidth = 5; ctx.strokeStyle = warna; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.restore();
}
function kilau(ctx: CanvasRenderingContext2D, cx: number, cy: number, p: number, warna: string) {
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
function bintangGaris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, warna: string) {
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
function hatiGaris(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, warna: string) {
  ctx.save();
  ctx.strokeStyle = warna; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.7);
  ctx.bezierCurveTo(cx - s * 1.3, cy - s * 0.2, cx - s * 0.5, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.1, cx + s * 1.3, cy - s * 0.2, cx, cy + s * 0.7);
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

export interface OpsiKartuStory {
  judul: string;
  subjudul?: string;      // ringkasan / teks pendukung di bawah judul
  labelKartu: string;     // label kecil di kartu pratinjau, mis. "ARTIKEL KIDZPLAYFUL"
  ajakan?: string;        // teks tombol CTA
  gambar?: string;        // foto utama (sampul)
}

export async function buatKartuStory(opts: OpsiKartuStory): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
  const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');

  // Pastikan font brand siap; kalau gagal, canvas jatuh ke system-ui (tetap terbaca).
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 110px ${fJudul}`),
      document.fonts.load(`700 46px ${fTeks}`),
      document.fonts.load(`600 40px ${fTeks}`),
    ]);
  } catch { /* lanjut dengan fallback */ }

  // Muat aset (logo satu origin; foto bisa gagal karena CORS → kartu tetap dibuat)
  const [logo, foto] = await Promise.all([
    muatGambar('/logo.png').catch(() => null),
    opts.gambar ? muatGambar(opts.gambar).catch(() => null) : Promise.resolve(null),
  ]);

  // ── Latar & ornamen ──────────────────────────────────────────────────────
  ctx.fillStyle = KRIM; ctx.fillRect(0, 0, W, H);
  blobKananAtas(ctx);
  blobKiriBawah(ctx);
  // Digeser naik setelah badge dihapus — pada posisi lama busurnya menyentuh baris judul.
  busurPutus(ctx, 1010, 150, 205, Math.PI * 0.18, Math.PI * 0.92, TEAL);
  hatiGaris(ctx, 1004, 596, 32, TEAL);

  // ── Logo ─────────────────────────────────────────────────────────────────
  if (logo) {
    const h = 118, w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, (W - w) / 2, 56, w, h);
  } else {
    ctx.textAlign = 'center'; ctx.fillStyle = NAVY;
    ctx.font = `800 66px ${fJudul}`;
    ctx.fillText('KidzPlayful', W / 2, 150);
  }

  // ── Judul (baris terakhir diberi warna teal, meniru aksen desain) ────────
  // Mulai lebih tinggi karena pil badge dihapus atas permintaan pemilik.
  const KIRI = 88, LEBAR = W - KIRI * 2;
  ctx.textAlign = 'left';
  ctx.font = `800 104px ${fJudul}`;
  const barisJudul = bungkusUkur(ctx, opts.judul, LEBAR, 3);
  let y = 336;
  barisJudul.forEach((b, i) => {
    ctx.fillStyle = i === barisJudul.length - 1 && barisJudul.length > 1 ? TEAL : NAVY;
    ctx.fillText(b, KIRI, y);
    y += 112;
  });

  // garis bawah kuning
  ctx.fillStyle = KUNING;
  jalurKotakBulat(ctx, KIRI, y - 60, 220, 11, 6); ctx.fill();

  // ── Subjudul ─────────────────────────────────────────────────────────────
  y += 20;
  if (opts.subjudul?.trim()) {
    ctx.fillStyle = NAVY;
    ctx.font = `600 46px ${fTeks}`;
    for (const b of bungkusUkur(ctx, opts.subjudul, LEBAR - 60, 2)) { ctx.fillText(b, KIRI, y); y += 58; }
  }

  // ── Blok bawah dipatok dari tepi bawah agar judul panjang tak merusak tata letak ──
  // CTA kini elemen terakhir (baris footer & URL dihapus), jadi diberi margin bawah wajar.
  const ctaH = 126, ctaY = H - 96 - ctaH;
  const prevH = 212, prevY = ctaY - 44 - prevH;

  // ── Foto utama: mengisi sisa ruang antara subjudul dan kartu pratinjau ───
  const fotoY = y + 24;
  const fotoH = Math.max(360, prevY - 34 - fotoY);
  if (foto) {
    ctx.save(); bayangan(ctx, 40, 16);
    ctx.fillStyle = '#fff'; jalurKotakBulat(ctx, KIRI, fotoY, LEBAR, fotoH, 46); ctx.fill();
    ctx.restore();
    gambarCover(ctx, foto, KIRI, fotoY, LEBAR, fotoH, 46);
  } else {
    // tanpa foto → panel lembut supaya komposisi tetap seimbang
    ctx.fillStyle = '#EFEAF8';
    jalurKotakBulat(ctx, KIRI, fotoY, LEBAR, fotoH, 46); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `700 120px ${fTeks}`;
    ctx.fillText('🎈', W / 2, fotoY + fotoH / 2 + 40);
    ctx.textAlign = 'left';
  }

  // Ornamen yang menimpa tepi foto — HARUS digambar setelah foto, kalau sebelum
  // akan tertutup penuh karena foto kini hampir selebar kanvas.
  bintangGaris(ctx, 1016, fotoY + 96, 42, PERI);
  kilau(ctx, 46, fotoY + fotoH - 70, 30, KUNING);

  // ── Kartu pratinjau tautan ───────────────────────────────────────────────
  ctx.save(); bayangan(ctx, 34, 12);
  ctx.fillStyle = '#fff'; jalurKotakBulat(ctx, 70, prevY, W - 140, prevH, 34); ctx.fill();
  ctx.restore();

  const thumb = 158, thumbX = 100, thumbY = prevY + (prevH - thumb) / 2;
  if (foto) gambarCover(ctx, foto, thumbX, thumbY, thumb, thumb, 24);
  else { ctx.fillStyle = '#EFEAF8'; jalurKotakBulat(ctx, thumbX, thumbY, thumb, thumb, 24); ctx.fill(); }

  const tx = thumbX + thumb + 30, tw = W - 70 - 120 - tx;
  ctx.fillStyle = TEAL; ctx.font = `700 26px ${fTeks}`;
  ctx.fillText(opts.labelKartu.toUpperCase(), tx, prevY + 56);
  ctx.fillStyle = NAVY; ctx.font = `700 40px ${fTeks}`;
  let ty = prevY + 108;
  for (const b of bungkusUkur(ctx, opts.judul, tw, 3)) { ctx.fillText(b, tx, ty); ty += 46; }

  // lingkaran panah
  const cx = W - 70 - 66, cy = prevY + prevH / 2;
  ctx.strokeStyle = TEAL; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = TEAL; ctx.textAlign = 'center'; ctx.font = `700 44px ${fTeks}`;
  ctx.fillText('›', cx + 2, cy + 16);

  // ── Tombol ajakan ────────────────────────────────────────────────────────
  ctx.save(); bayangan(ctx, 30, 12);
  ctx.fillStyle = NAVY; jalurKotakBulat(ctx, KIRI, ctaY, LEBAR, ctaH, ctaH / 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(KIRI + 76, ctaY + ctaH / 2, 40, 0, Math.PI * 2); ctx.fill();
  ctx.font = `700 42px ${fTeks}`; ctx.fillStyle = NAVY;
  ctx.fillText('🔗', KIRI + 76, ctaY + ctaH / 2 + 15);
  ctx.fillStyle = '#fff'; ctx.font = `800 44px ${fTeks}`;
  ctx.fillText(opts.ajakan ?? 'BACA SELENGKAPNYA DI SINI!', KIRI + 76 + (LEBAR - 76) / 2, ctaY + ctaH / 2 + 16);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/png'));
}

