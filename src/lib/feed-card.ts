// src/lib/feed-card.ts — kartu gambar Feed Instagram (1080×1080) via canvas.
//
// KENAPA 1:1 dan bukan 4:5: rasio persegi adalah satu-satunya yang TIDAK PERNAH dipotong —
// baik di feed, di grid profil, maupun saat dibagikan ulang. Postingan 4:5 tampil utuh di
// feed tapi dipangkas jadi persegi di grid profil, sehingga tepi atas/bawah bisa hilang.
//
// Isinya SAMA dengan kartu Story (judul, subjudul, foto, ajakan) — hanya tata letaknya yang
// disesuaikan: teks di kolom kiri, foto membiras di kanan, pita ajakan di bawah.
'use client';
import {
  KRIM, NAVY, TEAL, KUNING, PERI, BIRU_MUDA,
  ukuranPas, muatGambar, keluarga, siapkanFont,
  jalurKotakBulat, gambarCover, bayangan,
  kilau, bintangGaris, hatiGaris, busurPutus,
  type IsiKartu,
} from './kartu-bersama';

const W = 1080, H = 1080;

const KIRI = 64;              // margin kiri kolom teks
const FOTO_X = 512;           // seam: kiri foto = kanan kolom teks (dilebarkan agar crop tak ekstrem)
const KOLOM = FOTO_X - KIRI - 32;  // lebar kolom teks (452)
const PITA_Y = 920;           // pita ajakan di bawah

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
  // Ditaruh di ruang kosong bawah-kiri; di dekat judul busurnya menabrak baris pertama.
  busurPutus(ctx, 286, 760, 140, Math.PI * 1.15, Math.PI * 1.85, TEAL);

  // ── Foto: membiras ke tepi kanan ─────────────────────────────────────────
  // Digambar melewati tepi kanvas (x sampai W+60, y dari -60) supaya HANYA sudut
  // kiri yang tampak membulat — sudut kanan/atas jatuh di luar bidang.
  if (foto) {
    // fokusY 0,3: kotaknya portrait sementara sampul artikel umumnya landscape —
    // crop tengah memenggal wajah, jadi bidiknya digeser ke atas.
    gambarCover(ctx, foto, FOTO_X, -60, W + 60 - FOTO_X, PITA_Y + 60, 56, 0.3);
  } else {
    ctx.fillStyle = '#EFEAF8';
    jalurKotakBulat(ctx, FOTO_X, -60, W + 60 - FOTO_X, PITA_Y + 60, 56); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `700 120px ${fTeks}`;
    ctx.fillText('🎈', (FOTO_X + W) / 2, PITA_Y / 2);
    ctx.textAlign = 'left';
  }

  // Ornamen yang menimpa tepi foto — digambar SETELAH foto agar tidak tertutup.
  bintangGaris(ctx, FOTO_X, 172, 38, PERI);
  hatiGaris(ctx, FOTO_X + 4, 706, 28, TEAL);
  kilau(ctx, 438, 88, 26, KUNING);

  // ── Logo ─────────────────────────────────────────────────────────────────
  ctx.textAlign = 'left';
  if (logo) {
    const h = 82, w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, KIRI, 48, w, h);
  } else {
    ctx.fillStyle = NAVY; ctx.font = `800 48px ${fJudul}`;
    ctx.fillText('KidzPlayful', KIRI, 112);
  }

  // ── Judul: ukuran font menyesuaikan agar TIDAK PERNAH melewati kolom ─────
  const { px: pxJudul, baris: barisJudul } =
    ukuranPas(ctx, opts.judul, KOLOM, 3, (px) => `800 ${px}px ${fJudul}`, 74, 40);
  const lhJudul = Math.round(pxJudul * 1.14);
  let y = 232 + pxJudul * 0.5;
  barisJudul.forEach((b, i) => {
    ctx.fillStyle = i === barisJudul.length - 1 && barisJudul.length > 1 ? TEAL : NAVY;
    ctx.fillText(b, KIRI, y);
    y += lhJudul;
  });

  // garis bawah kuning
  ctx.fillStyle = KUNING;
  jalurKotakBulat(ctx, KIRI, y - lhJudul + 28, 168, 9, 5); ctx.fill();

  // ── Subjudul ─────────────────────────────────────────────────────────────
  y += 26;
  if (opts.subjudul?.trim()) {
    const { px: pxSub, baris: barisSub } =
      ukuranPas(ctx, opts.subjudul, KOLOM - 8, 3, (px) => `600 ${px}px ${fTeks}`, 32, 22);
    ctx.fillStyle = NAVY;
    for (const b of barisSub) { ctx.fillText(b, KIRI, y); y += Math.round(pxSub * 1.3); }
  }

  // ── Label kecil (identitas konten) ───────────────────────────────────────
  y += 14;
  ctx.fillStyle = TEAL; ctx.font = `700 22px ${fTeks}`;
  ctx.fillText(opts.labelKartu.toUpperCase(), KIRI, Math.min(y, PITA_Y - 60));

  // ── Pita ajakan di bawah ─────────────────────────────────────────────────
  ctx.fillStyle = BIRU_MUDA; ctx.fillRect(0, PITA_Y, W, H - PITA_Y);

  const ctaH = 104, ctaY = PITA_Y + (H - PITA_Y - ctaH) / 2, ctaX = KIRI, ctaW = W - KIRI * 2;
  ctx.save(); bayangan(ctx, 24, 10);
  ctx.fillStyle = NAVY; jalurKotakBulat(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ctaX + 62, ctaY + ctaH / 2, 33, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = `700 34px ${fTeks}`; ctx.fillStyle = NAVY;
  ctx.fillText('🔗', ctaX + 62, ctaY + ctaH / 2 + 12);

  // Teks ajakan ikut mengecil bila kepanjangan — pita tidak boleh melimpah.
  const lebarAjakan = ctaW - 62 - 70;
  const { px: pxCta, baris: barisCta } =
    ukuranPas(ctx, opts.ajakan ?? 'BACA SELENGKAPNYA DI SINI!', lebarAjakan, 1, (px) => `800 ${px}px ${fTeks}`, 38, 22);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${pxCta}px ${fTeks}`;
  ctx.fillText(barisCta[0] ?? '', ctaX + 62 + lebarAjakan / 2 + 20, ctaY + ctaH / 2 + pxCta * 0.36);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/png'));
}
