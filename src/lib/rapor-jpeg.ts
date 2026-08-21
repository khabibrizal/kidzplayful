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
  catatanGuru: {
    judulEvent: string; dinilai_oleh: string | null;
    penilaian: { area: string; indikator: string; nilai: string }[];
    catatan: string | null;
  }[];
  rekomendasi: number;
  rekomendasiPsikolog: { judul: string | null; isi: string | null; butir: { judul: string | null; isi: string | null }[]; oleh: string | null }[];
  rekomendasiItem: { jenis: 'produk' | 'event' | 'materi'; judul: string | null; catatan: string | null }[];
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

  // ——— Dua kolom isi ———
  //
  // Pembagiannya SENGAJA: kolom kiri untuk daftar pendek (kegiatan, area, event), kolom kanan
  // sepenuhnya untuk dua bagian panjang — catatan perkembangan & hasil konsultasi. Versi
  // pertama menaruh semuanya di kanan, dan hasilnya bagian konsultasi TIDAK IKUT TERCETAK
  // sementara kolom kiri kosong separuh. Itu ditemukan dari memeriksa gambarnya, bukan kodenya.
  const kiriX = 140, kananX = W / 2 + 40, kolomL = W / 2 - 220;
  const BATAS_BAWAH = H - 240;
  let yK = 1160, yR = 1160;

  const judulBagian = (teks: string, x: number, y: number) => {
    ctx.fillStyle = UNGU; ctx.font = `800 54px ${fJudul}`;
    ctx.fillText(teks, x, y);
    return y + 70;
  };
  const barisTeks = (teks: string, x: number, y: number, lebar: number, maksBaris = 2) => {
    const { px, baris } = ukuranPas(ctx, teks, lebar, maksBaris, (p) => `500 ${p}px ${fTeks}`, 44, 32);
    ctx.fillStyle = HITAM; ctx.font = `500 ${px}px ${fTeks}`;
    for (const b of baris) { ctx.fillText(b, x, y); y += Math.round(px * 1.28); }
    return y + 6;
  };

  // ——— KOLOM KIRI: daftar pendek ———
  yK = judulBagian('🎈 Ide Bermain di rumah', kiriX, yK);
  if (isi.daftarIdeBermain.length === 0) yK = barisTeks('Belum ada kegiatan tercatat bulan ini.', kiriX, yK, kolomL);
  else for (const it of isi.daftarIdeBermain.slice(0, 8)) {
    yK = barisTeks(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL, 1);
    if (yK > BATAS_BAWAH - 500) break;
  }

  yK += 26;
  yK = judulBagian('📺 Video yang ditonton', kiriX, yK);
  if (isi.daftarVideo.length === 0) yK = barisTeks('—', kiriX, yK, kolomL);
  else for (const it of isi.daftarVideo.slice(0, 5)) {
    yK = barisTeks(`• ${it.judul}${it.jumlah > 1 ? ` (${it.jumlah}×)` : ''}`, kiriX, yK, kolomL, 1);
    if (yK > BATAS_BAWAH - 300) break;
  }

  yK += 26;
  yK = judulBagian('🌱 Area yang paling dilatih', kiriX, yK);
  yK = barisTeks(isi.areaTerbanyak ?? 'Belum ada data', kiriX, yK, kolomL, 1);
  yK = barisTeks(`Total ⭐ ${isi.bintang} bintang terkumpul`, kiriX, yK, kolomL, 1);

  yK += 26;
  yK = judulBagian('🎈 Kelas bermain yang diikuti', kiriX, yK);
  if (isi.event.length === 0) yK = barisTeks('—', kiriX, yK, kolomL, 1);
  else for (const e of isi.event.slice(0, 5)) {
    yK = barisTeks(`• ${e}`, kiriX, yK, kolomL, 1);
    if (yK > BATAS_BAWAH) break;
  }

  // ——— KOLOM KANAN, bagian 1: catatan perkembangan ———
  // Diberi PLAFON agar bagian konsultasi di bawahnya dijamin kebagian ruang. Sisa yang tak
  // termuat disebut jumlahnya — tidak dihilangkan diam-diam.
  const adaKonsultasi = isi.rekomendasiPsikolog.length > 0 || isi.rekomendasiItem.length > 0 || isi.rekomendasi > 0;
  const plafonCatatan = adaKonsultasi ? 1160 + (BATAS_BAWAH - 1160) * 0.55 : BATAS_BAWAH;

  yR = judulBagian('📝 Catatan perkembangan', kananX, yR);
  if (isi.catatanGuru.length === 0) yR = barisTeks('—', kananX, yR, kolomL, 1);
  else {
    let dicetak = 0;
    for (const c of isi.catatanGuru) {
      if (yR > plafonCatatan - 90) break;
      yR = barisTeks(`• ${c.judulEvent}${c.dinilai_oleh ? ` — ${c.dinilai_oleh}` : ''}`, kananX, yR, kolomL, 1);
      for (const n of c.penilaian) {
        if (yR > plafonCatatan - 40) break;
        yR = barisTeks(`${n.area}: ${n.indikator} — ${n.nilai}`, kananX + 26, yR, kolomL - 26);
      }
      if (c.catatan && yR < plafonCatatan - 40) yR = barisTeks(`"${c.catatan}"`, kananX + 26, yR, kolomL - 26);
      dicetak += 1;
    }
    if (dicetak < isi.catatanGuru.length) {
      yR = barisTeks(`…dan ${isi.catatanGuru.length - dicetak} catatan lain — lihat di aplikasi`, kananX, yR, kolomL, 1);
    }
  }

  // ——— KOLOM KANAN, bagian 2: hasil konsultasi psikolog ———
  if (adaKonsultasi) {
    // Daftar item (produk / event / ide bermain) DIJAMIN kebagian ruang: tingginya dicadangkan
    // dulu, lalu bagian naratif di atasnya dibatasi sisa ruangnya. Tanpa cadangan ini, blok
    // rekomendasi item hilang total begitu rekomendasi naratifnya panjang — dan itu justru
    // bagian yang paling ditunggu orang tua.
    const MAKS_ITEM = 4;
    const nItem = Math.min(isi.rekomendasiItem.length, MAKS_ITEM);
    const cadanganItem = nItem > 0 ? 70 + nItem * 60 + (isi.rekomendasiItem.length > MAKS_ITEM ? 60 : 0) : 0;
    const plafonNaratif = BATAS_BAWAH - cadanganItem;

    yR = Math.max(yR + 26, plafonCatatan);
    yR = judulBagian('🧠 Hasil konsultasi psikolog', kananX, yR);
    if (isi.rekomendasi > 0) yR = barisTeks(`${isi.rekomendasi} sesi konsultasi bulan ini`, kananX, yR, kolomL, 1);
    let naratifDicetak = 0;
    for (const x of isi.rekomendasiPsikolog) {
      if (yR > plafonNaratif - 80) break;
      yR = barisTeks(`• ${x.judul || 'Rekomendasi'}${x.oleh ? ` — ${x.oleh}` : ''}`, kananX, yR, kolomL, 1);
      if (x.isi && yR < plafonNaratif - 40) yR = barisTeks(x.isi, kananX + 26, yR, kolomL - 26);
      for (const b of x.butir) {
        if (yR > plafonNaratif - 40) break;
        yR = barisTeks(`– ${b.judul ? `${b.judul}: ` : ''}${b.isi ?? ''}`, kananX + 26, yR, kolomL - 26, 1);
      }
      naratifDicetak += 1;
    }
    if (naratifDicetak < isi.rekomendasiPsikolog.length) {
      yR = barisTeks(`…dan ${isi.rekomendasiPsikolog.length - naratifDicetak} rekomendasi lain — lihat di aplikasi`, kananX, yR, kolomL, 1);
    }

    if (nItem > 0) {
      yR = Math.max(yR + 8, plafonNaratif);
      yR = barisTeks('🎁 Direkomendasikan:', kananX, yR, kolomL, 1);
      for (const it of isi.rekomendasiItem.slice(0, MAKS_ITEM)) {
        const label = it.jenis === 'materi' ? 'ide bermain' : it.jenis;
        yR = barisTeks(`• ${it.judul ?? '—'} (${label})${it.catatan ? ` · ${it.catatan}` : ''}`, kananX + 26, yR, kolomL - 26, 1);
      }
      if (isi.rekomendasiItem.length > MAKS_ITEM) {
        barisTeks(`…dan ${isi.rekomendasiItem.length - MAKS_ITEM} rekomendasi lain`, kananX + 26, yR, kolomL - 26, 1);
      }
    }
  }

  // Kaki
  ctx.textAlign = 'center';
  ctx.fillStyle = ABU; ctx.font = `italic 44px ${fTeks}`;
  ctx.fillText('Teruslah bermain, belajar, dan bertumbuh, ya! 💛  ·  KidzPlayful', W / 2, H - 130);

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/jpeg', 0.92));
}
