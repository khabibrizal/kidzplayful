// src/lib/feed-card.ts — kartu gambar Feed Instagram (1080×1080) via canvas.
//
// KENAPA 1:1 dan bukan 4:5: rasio persegi adalah satu-satunya yang TIDAK PERNAH dipotong —
// baik di feed, di grid profil, maupun saat dibagikan ulang. Postingan 4:5 tampil utuh di
// feed tapi dipangkas jadi persegi di grid profil, sehingga tepi atas/bawah bisa hilang.
//
// DUA ATURAN "TIDAK BOLEH TERPOTONG" — keduanya berasal dari keluhan nyata:
//  1) FOTO dipasang `contain`, BUKAN `cover`. Sampul artikel KidzPlayful sering memuat
//     TULISAN; memotongnya memenggal kata. Panel kanan diberi latar lembut supaya ruang
//     di sekitar foto terbaca sebagai bingkai, bukan sebagai kesalahan.
//  2) JUDUL & SUBJUDUL memakai `ukuranPas` dengan batas baris longgar dan ukuran minimum
//     kecil, sehingga judul panjang MENGECIL dan tetap utuh — bukan dipotong dengan "…".
'use client';
import {
  KRIM, NAVY, TEAL, KUNING, PERI, BIRU_MUDA,
  ukuranPas, muatGambar, keluarga, siapkanFont,
  jalurKotakBulat, gambarMuat, bayangan,
  kilau, bintangGaris, hatiGaris, busurPutus,
  type IsiKartu,
} from './kartu-bersama';

const W = 1080, H = 1080;

const KIRI = 56;                     // margin kiri kolom teks
const PANEL_X = 540;                 // batas kiri panel foto
const KOLOM = PANEL_X - KIRI - 36;   // lebar kolom teks (448)
const PITA_Y = 916;                  // pita ajakan di bawah

function blobKuningKiri(ctx: CanvasRenderingContext2D) {
  // Kecil dan menempel sudut kiri-bawah — versi besar terbaca seperti noda, bukan ornamen.
  ctx.fillStyle = KUNING;
  ctx.beginPath();
  ctx.moveTo(-40, 800);
  ctx.bezierCurveTo(70, 792, 152, 842, 152, 892);
  ctx.bezierCurveTo(152, 938, 80, 966, -40, 960);
  ctx.closePath();
  ctx.fill();
}

export async function buatKartuFeed(opts: IsiKartu): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
  const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');
  await siapkanFont(fJudul, fTeks);

  const [logo, foto] = await Promise.all([
    muatGambar('/logo.png').catch(() => null),
    opts.gambar ? muatGambar(opts.gambar).catch(() => null) : Promise.resolve(null),
  ]);

  // ── Latar & ornamen belakang ─────────────────────────────────────────────
  ctx.fillStyle = KRIM; ctx.fillRect(0, 0, W, H);
  blobKuningKiri(ctx);

  // ── Panel foto (kanan) ───────────────────────────────────────────────────
  // Latar lembut membiras ke tepi kanan; foto ditaruh UTUH di dalamnya.
  ctx.fillStyle = BIRU_MUDA;
  jalurKotakBulat(ctx, PANEL_X, -60, W + 60 - PANEL_X, PITA_Y + 60, 56); ctx.fill();

  const areaX = PANEL_X + 26, areaY = 56, areaW = W - areaX - 26, areaH = PITA_Y - areaY - 56;
  if (foto) {
    ctx.save(); bayangan(ctx, 30, 12);
    // gambarMuat mengembalikan kotak NYATA foto setelah diskalakan → bingkai pas di situ.
    const kotak = gambarMuat(ctx, foto, areaX, areaY, areaW, areaH, 28);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8;
    jalurKotakBulat(ctx, kotak.x, kotak.y, kotak.w, kotak.h, 28); ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = '#EFEAF8';
    jalurKotakBulat(ctx, areaX, areaY + areaH / 2 - 160, areaW, 320, 28); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `700 110px ${fTeks}`;
    ctx.fillText('🎈', areaX + areaW / 2, areaY + areaH / 2 + 36);
    ctx.textAlign = 'left';
  }

  // Ornamen di seam — digambar setelah panel agar tidak tertutup.
  bintangGaris(ctx, PANEL_X, 150, 38, PERI);
  hatiGaris(ctx, PANEL_X + 4, 742, 28, TEAL);
  kilau(ctx, 462, 84, 26, KUNING);

  // ── Logo ─────────────────────────────────────────────────────────────────
  ctx.textAlign = 'left';
  if (logo) {
    const h = 78, w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, KIRI, 44, w, h);
  } else {
    ctx.fillStyle = NAVY; ctx.font = `800 46px ${fJudul}`;
    ctx.fillText('KidzPlayful', KIRI, 104);
  }

  // ── Judul ────────────────────────────────────────────────────────────────
  // Sampai 5 baris & minimum 26px: judul panjang MENGECIL, tidak dipotong dengan "…".
  const { px: pxJudul, baris: barisJudul } =
    ukuranPas(ctx, opts.judul, KOLOM, 5, (px) => `800 ${px}px ${fJudul}`, 68, 26);
  const lhJudul = Math.round(pxJudul * 1.16);
  let y = 210 + pxJudul * 0.5;
  barisJudul.forEach((b, i) => {
    ctx.fillStyle = i === barisJudul.length - 1 && barisJudul.length > 1 ? TEAL : NAVY;
    ctx.fillText(b, KIRI, y);
    y += lhJudul;
  });

  // garis bawah kuning
  ctx.fillStyle = KUNING;
  jalurKotakBulat(ctx, KIRI, y - lhJudul + 26, 156, 9, 5); ctx.fill();

  // ── Subjudul ─────────────────────────────────────────────────────────────
  // Jumlah baris dibatasi RUANG YANG BENAR-BENAR TERSISA, bukan angka tetap — supaya
  // judul panjang tidak mendorong subjudul menabrak pita bawah.
  y += 28;
  if (opts.subjudul?.trim()) {
    const sisa = PITA_Y - 70 - y;
    const maksBaris = Math.max(1, Math.min(4, Math.floor(sisa / 34)));
    const { px: pxSub, baris: barisSub } =
      ukuranPas(ctx, opts.subjudul, KOLOM - 6, maksBaris, (px) => `600 ${px}px ${fTeks}`, 30, 19);
    ctx.fillStyle = NAVY;
    for (const b of barisSub) { ctx.fillText(b, KIRI, y); y += Math.round(pxSub * 1.32); }
  }

  // ── Label kecil ──────────────────────────────────────────────────────────
  y += 12;
  if (y < PITA_Y - 24) {
    ctx.fillStyle = TEAL; ctx.font = `700 21px ${fTeks}`;
    ctx.fillText(opts.labelKartu.toUpperCase(), KIRI, y);
  }

  // Ornamen pengisi ruang kosong — HANYA bila memang ada ruang. Pada artikel berjudul
  // panjang, kolom teks terisi penuh dan ornamen ini akan menabrak subjudul.
  if (y < 640) busurPutus(ctx, 268, 800, 128, Math.PI * 1.15, Math.PI * 1.85, TEAL);

  // ── Pita ajakan di bawah ─────────────────────────────────────────────────
  ctx.fillStyle = BIRU_MUDA; ctx.fillRect(0, PITA_Y, W, H - PITA_Y);

  const ctaH = 102, ctaY = PITA_Y + (H - PITA_Y - ctaH) / 2, ctaX = KIRI, ctaW = W - KIRI * 2;
  ctx.save(); bayangan(ctx, 24, 10);
  ctx.fillStyle = NAVY; jalurKotakBulat(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ctaX + 60, ctaY + ctaH / 2, 32, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `700 33px ${fTeks}`; ctx.fillStyle = NAVY;
  ctx.fillText('🔗', ctaX + 60, ctaY + ctaH / 2 + 12);

  // Teks ajakan ikut mengecil bila kepanjangan — pita tidak boleh melimpah.
  const lebarAjakan = ctaW - 60 - 70;
  const { px: pxCta, baris: barisCta } =
    ukuranPas(ctx, opts.ajakan ?? 'BACA SELENGKAPNYA DI SINI!', lebarAjakan, 1, (px) => `800 ${px}px ${fTeks}`, 38, 20);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${pxCta}px ${fTeks}`;
  ctx.fillText(barisCta[0] ?? '', ctaX + 60 + lebarAjakan / 2 + 20, ctaY + ctaH / 2 + pxCta * 0.36);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/png'));
}
