// src/lib/story-card.ts — kartu gambar Story (1080×1920) via canvas untuk dibagikan ke IG/WA Story.
// Gaya mengikuti desain kartu artikel KidzPlayful: latar krem, blob dekoratif, judul dua warna,
// foto besar, kartu pratinjau tautan, dan tombol ajakan. Tanpa dependency — murni canvas.
// Bagian yang dipakai bersama kartu Feed ada di `kartu-bersama.ts`.
'use client';
import {
  KRIM, NAVY, TEAL, KUNING, PERI,
  bungkusUkur, muatGambar, keluarga, siapkanFont,
  jalurKotakBulat, gambarCover, bayangan,
  busurPutus, kilau, bintangGaris, hatiGaris,
  type IsiKartu,
} from './kartu-bersama';

export { bungkusTeks } from './kartu-bersama';
export type OpsiKartuStory = IsiKartu;

const W = 1080, H = 1920;

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

export async function buatKartuStory(opts: IsiKartu): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
  const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');
  await siapkanFont(fJudul, fTeks);

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
