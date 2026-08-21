// src/lib/rapor-jpeg.ts — render rapor bulanan ke JPEG A4 LANDSCAPE.
//
// Memakai ulang helper kanvas yang sama dengan e-sertifikat & kartu Instagram
// (`kartu-bersama.ts`) — tanpa dependensi baru. Alasan memilih kanvas, bukan cetak-ke-PDF:
// ukuran berkasnya PASTI, tidak bergantung setelan skala/margin/header-footer pengguna.
'use client';
import { ukuranPas, muatGambar, keluarga, siapkanFont } from './kartu-bersama';

const W = 3508, H = 2480;            // A4 landscape @300dpi
const HITAM = '#000000';
const UNGU = '#6b4fb0';
const ABU = '#6b6b7b';

export interface IsiRapor {
  namaAnak: string;
  periode: string;                   // mis. "Agustus 2026"
  ideBermain: number;
  video: number;
  sesiGame: number;
  bintang: number;
  menit: number;
  areaTerbanyak: string | null;
  daftarIdeBermain: { judul: string; jumlah: number }[];
  daftarVideo: { judul: string; jumlah: number }[];
  event: string[];
  catatanGuru: { judulEvent: string; dinilai_oleh: string | null }[];
  rekomendasi: number;
}

export async function buatRaporJpeg(isi: IsiRapor): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  const fJudul = keluarga('--font-baloo', 'system-ui, sans-serif');
  const fTeks = keluarga('--font-quick', 'system-ui, sans-serif');
  await siapkanFont(fJudul, fTeks);
  const logo = await muatGambar('/logo.png').catch(() => null);

  // Latar + bingkai
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#f8f5ff'); g.addColorStop(1, '#f0fbf5');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = UNGU; ctx.lineWidth = 10; ctx.strokeRect(46, 46, W - 92, H - 92);

  // Kepala
  if (logo) {
    const h = 150, w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, 140, 130, w, h);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = ABU; ctx.font = `600 56px ${fTeks}`;
  ctx.fillText('RAPOR BULANAN', W - 140, 200);
  ctx.fillStyle = UNGU; ctx.font = `800 72px ${fJudul}`;
  ctx.fillText(isi.periode, W - 140, 285);

  ctx.textAlign = 'left';
  ctx.fillStyle = ABU; ctx.font = `600 52px ${fTeks}`;
  ctx.fillText('Nama anak', 140, 420);
  {
    const { px, baris } = ukuranPas(ctx, isi.namaAnak, W * 0.55, 1, (p) => `800 ${p}px ${fJudul}`, 120, 60);
    ctx.fillStyle = HITAM; ctx.font = `800 ${px}px ${fJudul}`;
    ctx.fillText(baris[0] ?? isi.namaAnak, 140, 420 + px);
  }

  // Empat angka utama
  const kotak = [
    { n: String(isi.ideBermain), l: 'Ide Bermain' },
    { n: String(isi.video), l: 'Video ditonton' },
    { n: String(isi.sesiGame), l: 'Sesi game' },
    { n: `${isi.menit} m`, l: 'Total waktu main' },
  ];
  const kw = (W - 280 - 3 * 40) / 4;
  kotak.forEach((k, i) => {
    const x = 140 + i * (kw + 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 700, kw, 320);
    ctx.strokeStyle = '#e6e0f2'; ctx.lineWidth = 4; ctx.strokeRect(x, 700, kw, 320);
    ctx.textAlign = 'center';
    ctx.fillStyle = UNGU; ctx.font = `800 118px ${fJudul}`;
    ctx.fillText(k.n, x + kw / 2, 870);
    ctx.fillStyle = ABU; ctx.font = `600 46px ${fTeks}`;
    ctx.fillText(k.l, x + kw / 2, 960);
  });
  ctx.textAlign = 'left';

  // Dua kolom isi
  const kiriX = 140, kananX = W / 2 + 40, kolomL = W / 2 - 220;
  let yK = 1160, yR = 1160;

  const judulBagian = (teks: string, x: number, y: number) => {
    ctx.fillStyle = UNGU; ctx.font = `800 54px ${fJudul}`;
    ctx.fillText(teks, x, y);
    return y + 70;
  };
  const barisTeks = (teks: string, x: number, y: number, lebar: number) => {
    const { px, baris } = ukuranPas(ctx, teks, lebar, 2, (p) => `500 ${p}px ${fTeks}`, 46, 34);
    ctx.fillStyle = HITAM; ctx.font = `500 ${px}px ${fTeks}`;
    for (const b of baris) { ctx.fillText(b, x, y); y += Math.round(px * 1.3); }
    return y + 8;
  };

  yK = judulBagian('🎈 Ide Bermain di rumah', kiriX, yK);
  if (isi.daftarIdeBermain.length === 0) yK = barisTeks('Belum ada kegiatan tercatat bulan ini.', kiriX, yK, kolomL);
  else for (const it of isi.daftarIdeBermain.slice(0, 8)) {
    yK = barisTeks(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL);
    if (yK > H - 520) break;
  }

  yK += 30;
  yK = judulBagian('📺 Video yang ditonton', kiriX, yK);
  if (isi.daftarVideo.length === 0) yK = barisTeks('—', kiriX, yK, kolomL);
  else for (const it of isi.daftarVideo.slice(0, 5)) {
    yK = barisTeks(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL);
    if (yK > H - 400) break;
  }

  yR = judulBagian('🌱 Area yang paling dilatih', kananX, yR);
  yR = barisTeks(isi.areaTerbanyak ? isi.areaTerbanyak : 'Belum ada data', kananX, yR, kolomL);
  yR = barisTeks(`Total ⭐ ${isi.bintang} bintang terkumpul`, kananX, yR, kolomL);

  yR += 30;
  yR = judulBagian('🎈 Kelas bermain yang diikuti', kananX, yR);
  if (isi.event.length === 0) yR = barisTeks('—', kananX, yR, kolomL);
  else for (const e of isi.event.slice(0, 5)) yR = barisTeks(`• ${e}`, kananX, yR, kolomL);

  yR += 30;
  yR = judulBagian('📝 Catatan guru', kananX, yR);
  if (isi.catatanGuru.length === 0) yR = barisTeks('—', kananX, yR, kolomL);
  else for (const c of isi.catatanGuru.slice(0, 4)) {
    yR = barisTeks(`• ${c.judulEvent}${c.dinilai_oleh ? ` — ${c.dinilai_oleh}` : ''}`, kananX, yR, kolomL);
  }
  if (isi.rekomendasi > 0) yR = barisTeks(`🧠 ${isi.rekomendasi} rekomendasi psikolog bulan ini`, kananX, yR, kolomL);

  // Kaki
  ctx.textAlign = 'center';
  ctx.fillStyle = ABU; ctx.font = `italic 44px ${fTeks}`;
  ctx.fillText('Teruslah bermain, belajar, dan bertumbuh, ya! 💛  ·  KidzPlayful', W / 2, H - 130);

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/jpeg', 0.92));
}
