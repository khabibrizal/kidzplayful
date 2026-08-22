// src/lib/domain/entitlement.ts — SATU tempat keputusan hak akses.
//
// Kenapa dipusatkan: sebelum ini akses ditentukan `dibatasiTrial(status)` yang bertebaran di
// 7 halaman dan hanya mengenal dua keadaan (aktif / bukan). Dengan paket berjenjang DAN status
// yang menempel pada tiap ANAK — satu akun bisa punya anak Preschool dan anak Basic — cabang
// boolean seperti itu mustahil benar. Semua hak sekarang DATA dari baris paket; berkas ini
// hanya memilih paket mana yang berlaku untuk seorang anak pada suatu waktu.
import { statusLangganan, type StatusLangganan } from './trial';
import { tanggalWIB } from './gamifikasi';
import type { PaketLangganan, BarisLanggananAnak, SatuanKuota } from '@/lib/game/tipe';


export interface KonfigTrial {
  trialMulai: string | null;   // 'YYYY-MM-DD' dari langganan AKUN (trial milik akun, bukan anak)
  trialHari: number;
  tenggangHari: number;
  trialPaketId: string | null;
}

export interface HakAksesAnak {
  status: StatusLangganan;
  paket: PaketLangganan | null;
  ideBermain: boolean;
  game: boolean;
  video: boolean;
  worksheet: boolean;
  raporBulanan: boolean;
  konsultasiGratis: { jumlah: number; satuan: SatuanKuota };
}

/** Hak paling dasar: boleh melihat rapor lama, tanpa konten baru. */
export const HAK_KOSONG: Omit<HakAksesAnak, 'status' | 'paket'> = {
  ideBermain: false, game: false, video: false, worksheet: false, raporBulanan: false,
  konsultasiGratis: { jumlah: 0, satuan: 'bulan' },
};

const tgl = (s: string | null): Date | null => (s ? new Date(s + 'T00:00:00Z') : null);

/**
 * Geser tanggal 'YYYY-MM-DD' sebanyak n hari (boleh negatif).
 *
 * Dipakai bersama oleh aturan tenggang di sini dan oleh `hentikanPaketAnak` — satu
 * implementasi supaya "hari terakhir" tak pernah berbeda antara keduanya.
 */
export function tambahHari(ymd: string, n: number): string {
  const t = new Date(ymd + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

function dariPaket(p: PaketLangganan): Omit<HakAksesAnak, 'status' | 'paket'> {
  return {
    ideBermain: p.akses_ide_bermain,
    game: p.akses_game,
    video: p.akses_video,
    worksheet: p.worksheet,
    raporBulanan: p.rapor_bulanan,
    konsultasiGratis: { jumlah: p.konsultasi_gratis_jumlah, satuan: p.konsultasi_gratis_satuan },
  };
}

/**
 * Hak akses satu anak.
 *
 * Urutannya: periode berbayar anak itu (`paket_id` + `aktif_sampai`) → bila belum pernah
 * berbayar, masa trial AKUN → tenggang memakai paket terakhir → selebihnya kadaluarsa.
 *
 * `paket_id` yang tak ditemukan di master (paket dihapus / migrasi belum jalan) menghasilkan
 * hak KOSONG, bukan lemparan galat: kegagalan membaca master tidak boleh membuka fasilitas
 * berbayar, dan juga tidak boleh mematikan halamannya.
 */
export function hakAksesAnak(
  baris: BarisLanggananAnak | null,
  paketMap: Map<string, PaketLangganan>,
  trial: KonfigTrial,
  sekarang: Date,
): HakAksesAnak {
  const aktifSampai = baris?.aktif_sampai ?? null;
  const paketAnak = baris?.paket_id ? paketMap.get(baris.paket_id) ?? null : null;

  // Sudah pernah berbayar → statusnya ditentukan periode anak itu sendiri.
  //
  // Perbandingannya memakai TANGGAL WIB, bukan `Date` vs tengah malam UTC. Versi lama
  // (`sekarang <= aktif_sampai` dengan aktif_sampai = 00:00 UTC) membuat langganan yang
  // berakhir HARI INI langsung dianggap habis sejak jam 07:00 WIB — hari terakhir yang
  // sudah dibayar hilang, dan statusnya turun ke 'tenggang' padahal masih aktif. Di sisi
  // SQL (`aktif_sampai >= current_date` di RPC konsultasi) hari itu justru masih dihitung
  // aktif, jadi kedua sisi sempat menjawab beda untuk anak yang sama.
  if (aktifSampai) {
    const hariIni = tanggalWIB(sekarang);
    if (hariIni <= aktifSampai) {
      return paketAnak
        ? { status: 'aktif', paket: paketAnak, ...dariPaket(paketAnak) }
        : { status: 'aktif', paket: null, ...HAK_KOSONG };
    }
    // Tenggang hanya berlaku bila paketnya masih tercatat. Penghentian oleh admin
    // MENGOSONGKAN `paket_id`, jadi hak berbayarnya putus saat itu juga — tenggang
    // adalah kemurahan untuk yang lupa memperpanjang, bukan untuk yang dihentikan.
    const akhirTenggang = tambahHari(aktifSampai, trial.tenggangHari);
    if (hariIni <= akhirTenggang && paketAnak) {
      return { status: 'tenggang', paket: paketAnak, ...dariPaket(paketAnak) };
    }
    return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
  }

  // Belum pernah berbayar → ikut masa trial akun.
  const mulai = tgl(trial.trialMulai);
  if (!mulai) return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
  const status = statusLangganan({ trialMulai: mulai, aktifSampai: null }, sekarang,
    { trialHari: trial.trialHari, tenggangHari: trial.tenggangHari });
  if (status === 'trial' || status === 'tenggang') {
    const paketTrial = trial.trialPaketId ? paketMap.get(trial.trialPaketId) ?? null : null;
    return paketTrial
      ? { status, paket: paketTrial, ...dariPaket(paketTrial) }
      : { status, paket: null, ...HAK_KOSONG };
  }
  return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
}

export interface HakAksesAkun {
  paketTertinggi: PaketLangganan | null;
  /** kode paket untuk diskon event & produk (null = bukan pelanggan). */
  diskonKode: string | null;
  komunitas: boolean;
  /**
   * Status anak yang paketnya terpilih. Dibutuhkan karena hak yang berasal dari TRIAL tidak
   * setara dengan hak berbayar — unduh worksheet, misalnya, dibatasi satu kali untuk trial.
   * Tanpa field ini, pemanggil hanya melihat "ada paket" dan memperlakukan keduanya sama.
   */
  status: StatusLangganan;
}

/**
 * Hak tingkat AKUN untuk fitur yang tidak punya konteks anak — diskon event & produk,
 * Komunitas, detail materi.
 *
 * Aturannya: pakai paket TERTINGGI (`urutan` terbesar) di antara anak yang berstatus
 * aktif/trial/tenggang. Satu keranjang belanja dan satu pendaftaran event tak bisa memakai
 * dua tarif sekaligus, dan memilih yang tertinggi adalah satu-satunya aturan yang tak pernah
 * merugikan pelanggan. Aturan ini WAJIB ditulis di UI, jangan disembunyikan.
 */
export function hakAksesAkun(hakAnak: HakAksesAnak[]): HakAksesAkun {
  const berlaku = hakAnak.filter((h) => h.paket && h.status !== 'kadaluarsa');
  const tertinggi = berlaku.reduce<PaketLangganan | null>(
    (t, h) => (h.paket && (!t || h.paket.urutan > t.urutan) ? h.paket : t), null);
  // Status milik anak yang paketnya TERPILIH — bukan status "terbaik" mana pun. Kalau
  // diambil dari anak lain, akun bisa tampak berbayar hanya karena satu anaknya masih trial.
  const pemilik = berlaku.find((h) => h.paket === tertinggi) ?? null;
  return {
    paketTertinggi: tertinggi,
    diskonKode: tertinggi?.kode ?? null,
    komunitas: tertinggi ? tertinggi.akses_komunitas : false,
    status: pemilik?.status ?? 'kadaluarsa',
  };
}
