// src/lib/sertifikat-jpeg.ts — render e-sertifikat ke JPEG ukuran A4 LANDSCAPE.
//
// Kenapa canvas dan bukan cetak-ke-PDF: hasilnya berkas gambar yang ukurannya PASTI
// (bukan bergantung setelan dialog cetak pengguna: skala, margin, header/footer).
// Memakai helper yang sama dengan kartu Instagram — tanpa library tambahan.
//
// UKURAN: A4 landscape 297×210 mm pada 300 DPI = 3508×2480 px. Rasio 1,414:1 sama
// persis dengan tampilan di layar (`aspectRatio: 1.414/1`), jadi tata letaknya identik.
//
// WARNA: seluruh teks HITAM kecuali NAMA ANAK (permintaan pemilik) — nama tetap
// memakai warna brand supaya tetap menjadi fokus sertifikat.
'use client';
import {
  ukuranPas, muatGambar, keluarga, siapkanFont, gambarMuat,
} from './kartu-bersama';

const W = 3508, H = 2480;          // A4 landscape @300dpi
const HITAM = '#000000';
const NAMA_WARNA = '#6b4fb0';      // var(--lavender-d)

export interface IsiSertifikat {
  anakNama: string;
  eventJudul: string;
  tanggalLokasi: string;           // "10 Juli 2026 · Surabaya" (boleh kosong)
  bgUrl?: string | null;           // template JPEG dari admin (opsional)
  diterbitkanOleh?: string | null; // hanya dipakai pada desain bawaan
}

export async function buatSertifikatJpeg(isi: IsiSertifikat): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
  const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');
  await siapkanFont(fJudul, fTeks);

  const [bg, logo] = await Promise.all([
    isi.bgUrl ? muatGambar(isi.bgUrl).catch(() => null) : Promise.resolve(null),
    muatGambar('/logo.png').catch(() => null),
  ]);

  // ── Latar ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  if (bg) {
    // `contain` — template tidak boleh terpotong (pola yang sama dengan kartu Feed).
    gambarMuat(ctx, bg, 0, 0, W, H, 0);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#f6f1ff'); g.addColorStop(1, '#eafaf1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // bingkai ganda seperti desain bawaan di layar
    ctx.strokeStyle = NAMA_WARNA;
    ctx.lineWidth = 10; ctx.strokeRect(46, 46, W - 92, H - 92);
    ctx.lineWidth = 5;  ctx.strokeRect(76, 76, W - 152, H - 152);
  }

  ctx.textAlign = 'center';
  const tengah = W / 2;
  const kolom = W * (bg ? 0.76 : 0.84);   // template biasanya punya ornamen di tepi

  // Tinggi blok dihitung dulu agar seluruh teks benar-benar terpusat vertikal.
  type Baris = { teks: string[]; px: number; font: string; warna: string; jarakAtas: number; miring?: boolean };
  const blok: Baris[] = [];

  const tambah = (teks: string, pxAwal: number, tebal: number, warna: string, jarakAtas: number, maksBaris = 2, miring = false) => {
    const { px, baris } = ukuranPas(ctx, teks, kolom, maksBaris,
      (p) => `${miring ? 'italic ' : ''}${tebal} ${p}px ${fTeks}`, pxAwal, Math.round(pxAwal * 0.5));
    blok.push({ teks: baris, px, font: `${miring ? 'italic ' : ''}${tebal} ${px}px ${fTeks}`, warna, jarakAtas, miring });
  };

  if (!bg) {
    ctx.font = `800 78px ${fJudul}`;
    blok.push({ teks: ['SERTIFIKAT KELAS BERMAIN'], px: 78, font: `800 78px ${fJudul}`, warna: HITAM, jarakAtas: 0 });
  }
  tambah('Dengan bangga diberikan kepada', 50, 600, HITAM, bg ? 0 : 90);

  // NAMA — satu-satunya teks berwarna.
  {
    const { px, baris } = ukuranPas(ctx, isi.anakNama, kolom, 2, (p) => `800 ${p}px ${fJudul}`, 132, 60);
    blok.push({ teks: baris, px, font: `800 ${px}px ${fJudul}`, warna: NAMA_WARNA, jarakAtas: 42 });
  }

  tambah('atas partisipasi ceria dan rasa ingin tahunya yang hebat selama mengikuti', 58, 500, HITAM, 60, 2);
  tambah(isi.eventJudul, 64, 700, HITAM, 40, 2);
  if (isi.tanggalLokasi.trim()) tambah(isi.tanggalLokasi, 50, 500, HITAM, 30, 2);
  tambah('Teruslah bermain, belajar, dan bertumbuh, ya! 💛', 54, 500, HITAM, 84, 1, true);
  if (!bg && isi.diterbitkanOleh) tambah(`KidzPlayful · ${isi.diterbitkanOleh}`, 42, 500, HITAM, 70, 1);

  const tinggiBlok = blok.reduce((n, b) => n + b.jarakAtas + b.teks.length * Math.round(b.px * 1.22), 0);
  const adaLogo = !bg && !!logo;
  const tinggiLogo = adaLogo ? 190 : 0;
  let y = (H - tinggiBlok - tinggiLogo) / 2 + tinggiLogo;

  if (adaLogo && logo) {
    const h = 150, w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, tengah - w / 2, y - tinggiLogo, w, h);
  }

  for (const b of blok) {
    y += b.jarakAtas;
    ctx.font = b.font; ctx.fillStyle = b.warna;
    for (const t of b.teks) { y += Math.round(b.px * 1.22); ctx.fillText(t, tengah, y); }
  }

  return await new Promise<Blob>((res, rej) =>
    // kualitas 0,92: tajam untuk dicetak, ukuran berkas masih wajar
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/jpeg', 0.92));
}
