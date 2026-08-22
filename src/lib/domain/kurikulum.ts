// src/lib/domain/kurikulum.ts — aturan kurikulum bulanan (murni, tanpa I/O).
//
// Kohort itu MILIK ANAK, bukan akun: kakak di bulan ke-3 TIDAK membuka tema itu untuk bayi
// yang masih bulan ke-1. Karena itu satu-satunya masukan waktu di berkas ini adalah
// `bulanAnak` — tak ada varian tingkat akun yang bisa dipanggil keliru lalu diam-diam
// menggabungkan kohort dua anak.
//
// Jam kohortnya mengikuti JUMLAH BULAN BERLANGGANAN (bukan tanggal kalender), jadi angkanya
// datang dari penghitung tersimpan `langganan_anak.bulan_kurikulum`.
export interface TemaKurikulum { id: string; judul: string; bulan_kurikulum?: number | null; urutan?: number | null }
export type StatusTema = 'terbuka' | 'kunci-judul' | 'tersembunyi';
export interface ButirEvaluasi { aktivitas: string; butir: string; tercapai: boolean }

/** Bulan kurikulum seorang anak. Minimal 1: trial & Basic pun ikut kurikulum (bulan ke-1). */
export function bulanKurikulumAnak(bulanTersimpan?: number | null): number {
  const n = Math.floor(Number(bulanTersimpan) || 0);
  return n < 1 ? 1 : n;
}

/**
 * Tema tanpa `bulan_kurikulum` (materi lama, atau migrasi 0098 belum dijalankan) dianggap
 * TERBUKA. Default yang salah arah di sini akan mengunci konten yang tadinya sudah jalan —
 * dan itu terbaca sebagai fitur dicabut, bukan sebagai fitur baru.
 */
export function statusTema(tema: TemaKurikulum, bulanAnak: number): StatusTema {
  const b = Math.floor(Number(tema?.bulan_kurikulum) || 0);
  if (b < 1) return 'terbuka';
  if (b <= bulanAnak) return 'terbuka';
  if (b === bulanAnak + 1) return 'kunci-judul';
  // Lebih dari sebulan ke depan disembunyikan: memajang 12 bulan judul sekaligus
  // mematikan rasa penasaran, bukan menumbuhkannya.
  return 'tersembunyi';
}

const urut = (a: TemaKurikulum, b: TemaKurikulum) =>
  (a.bulan_kurikulum ?? 0) - (b.bulan_kurikulum ?? 0) || (a.urutan ?? 0) - (b.urutan ?? 0);

/** Pisahkan daftar tema menurut kohort SEORANG anak, untuk tiga bagian di layar. */
export function kelompokTema<T extends TemaKurikulum>(list: T[], bulanAnak: number): {
  bulanIni: T[]; sudahTerbuka: T[]; bulanDepan: T[];
} {
  const bulanIni: T[] = [];
  const sudahTerbuka: T[] = [];
  const bulanDepan: T[] = [];
  for (const t of list ?? []) {
    const st = statusTema(t, bulanAnak);
    if (st === 'kunci-judul') bulanDepan.push(t);
    else if (st === 'terbuka') {
      // Materi lama tanpa bulan (b < 1) ikut "sudah terbuka" — ia memang bisa dibuka,
      // hanya bukan bagian bulan berjalan.
      if (Math.floor(Number(t.bulan_kurikulum) || 0) === bulanAnak) bulanIni.push(t);
      else sudahTerbuka.push(t);
    }
  }
  return {
    bulanIni: bulanIni.sort(urut),
    // Diurutkan dari yang TERBARU: bulan lalu lebih relevan daripada bulan ke-1.
    sudahTerbuka: sudahTerbuka.sort((a, b) => urut(b, a)),
    bulanDepan: bulanDepan.sort(urut),
  };
}

/** Bentuk aktivitas yang dibutuhkan untuk menyusun hasil evaluasi. */
export interface AktivitasEvaluasi { judul?: string | null; evaluasi?: string[] | null }

/**
 * Susun hasil checklist dari materi + daftar indeks yang dicentang klien.
 *
 * Kalimat butirnya SELALU datang dari `aktivitas` (sumber server), tak pernah dari klien:
 * rapor adalah dokumen yang ditunjukkan ke orang lain, jadi isinya harus berasal dari
 * materi. Indeks yang menunjuk ke butir tak ada diabaikan diam-diam — itu bukan galat
 * pengguna, melainkan materi yang berubah sejak layar dibuka.
 */
export function susunHasilEvaluasi(
  aktivitas: AktivitasEvaluasi[] | null | undefined,
  dicentang: Record<string, number[]> | null | undefined,
): ButirEvaluasi[] {
  const out: ButirEvaluasi[] = [];
  (aktivitas ?? []).forEach((a, ai) => {
    const centang = new Set(dicentang?.[String(ai)] ?? []);
    (a?.evaluasi ?? []).forEach((butir, bi) => {
      const teks = (butir ?? '').trim();
      if (!teks) return;   // butir kosong tak pernah jadi baris rapor
      out.push({ aktivitas: (a?.judul ?? '').trim() || `Aktivitas ${ai + 1}`, butir: teks, tercapai: centang.has(bi) });
    });
  });
  return out;
}

/**
 * Tema yang BELUM terbuka untuk seorang anak — bulan depan maupun lebih jauh — diurutkan
 * dari yang paling dekat.
 *
 * Kenapa perlu: aturan repo ini membatasi konten dengan **kunci** (🔒), bukan dengan
 * menyembunyikannya (lihat CLAUDE.md tentang `redirect`/`dibatasiTrial`). Menyembunyikan
 * tema membuat pemilik melihat 5 tema aktif di admin tapi hanya 4 di halaman pengguna, dan
 * itu tak bisa dibedakan dari data yang hilang. Jadi semuanya tetap tampil; yang belum
 * waktunya cukup dikunci beserta keterangan bulannya.
 */
export function temaTerkunci<T extends TemaKurikulum>(list: T[], bulanAnak: number): T[] {
  return (list ?? [])
    .filter((t) => statusTema(t, bulanAnak) !== 'terbuka')
    .sort(urut);
}

export function ringkasEvaluasi(hasil: ButirEvaluasi[] | null | undefined): { total: number; tercapai: number; persen: number } {
  const h = hasil ?? [];
  const tercapai = h.filter((x) => x.tercapai).length;
  return { total: h.length, tercapai, persen: h.length ? Math.round((tercapai / h.length) * 100) : 0 };
}

/**
 * Posisi sebuah tema di dalam kurikulum: bulan ke-berapa, minggu ke-berapa.
 *
 * MINGGU DITURUNKAN, bukan disimpan: kurikulum dirancang 4 tema per bulan, jadi urutan
 * tema di dalam bulannya = minggunya. Menyimpannya sebagai kolom tersendiri akan membuat
 * dua sumber kebenaran yang bisa saling bertentangan (mis. tema minggu ke-5 di bulan
 * berisi 3 tema). Bila sebuah bulan diisi lebih dari 4 tema, nomornya tetap berlanjut —
 * itu tanda isinya perlu dirapikan, bukan sesuatu yang perlu disembunyikan kode.
 */
export function posisiTema<T extends TemaKurikulum>(
  semua: T[], kelasId: string,
): { bulan: number; minggu: number } | null {
  const tema = (semua ?? []).find((k) => k.id === kelasId);
  if (!tema) return null;
  const bulan = Math.floor(Number(tema.bulan_kurikulum) || 0);
  if (bulan < 1) return null;   // materi lama tanpa bulan → tak punya posisi kurikulum
  const sebulan = semua
    .filter((k) => Math.floor(Number(k.bulan_kurikulum) || 0) === bulan)
    .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0) || a.id.localeCompare(b.id));
  const i = sebulan.findIndex((k) => k.id === kelasId);
  return { bulan, minggu: i < 0 ? 1 : i + 1 };
}

/** Ringkasan hasil evaluasi DIKELOMPOKKAN per aktivitas — bukan hanya per tema. */
export function evaluasiPerAktivitas(hasil: ButirEvaluasi[] | null | undefined): {
  aktivitas: string; tercapai: number; total: number; belum: string[];
}[] {
  const urutan: string[] = [];
  const map = new Map<string, { tercapai: number; total: number; belum: string[] }>();
  for (const b of hasil ?? []) {
    const nama = (b.aktivitas ?? '').trim() || 'Aktivitas';
    if (!map.has(nama)) { map.set(nama, { tercapai: 0, total: 0, belum: [] }); urutan.push(nama); }
    const g = map.get(nama)!;
    g.total++;
    if (b.tercapai) g.tercapai++; else g.belum.push(b.butir);
  }
  // Urutannya mengikuti urutan butir tersimpan = urutan aktivitas di materi.
  return urutan.map((nama) => ({ aktivitas: nama, ...map.get(nama)! }));
}
