// src/lib/domain/siklus-kurikulum.ts — jam kurikulum seorang anak (murni, tanpa I/O).
//
// Tiga aturan yang ditegakkan di sini, semuanya keputusan pemilik:
//
//   1. SIKLUS = BULAN KALENDER, bukan jumlah bulan yang dibayar. Membayar 12 bulan sekaligus
//      tidak membuka 12 bulan kurikulum di hari yang sama; ia hanya menaikkan BATAS-nya.
//   2. KATEGORI USIA DIBEKUKAN sepanjang satu siklus. Umur dihitung dari AWAL siklus, jadi
//      ulang tahun di tengah bulan tak mengganti daftar tema yang sedang dikerjakan.
//   3. NOMOR BULAN DIHITUNG PER KATEGORI. Anak yang naik ke kategori berikutnya memulai
//      kategori itu dari bulan ke-1 — bukan langsung terbuka sebanyak total bulannya.
//
// Semuanya DITURUNKAN dari satu tanggal tersimpan (`langganan_anak.kurikulum_mulai`, 0104).
// Tak ada penghitung yang perlu dinaikkan berkala, jadi tak ada cron yang bisa gagal diam-diam
// dan tak ada penulisan saat render.
import { umurTahun } from './anak';

/** Kategori usia dari master, seperlunya saja. */
export interface BracketUsia { id: string; usia_min: number; usia_max: number }

/** Kunci untuk "tanpa kategori" — materi lama yang hanya punya rentang usia. */
export const TANPA_BRACKET = '';

/**
 * Tambah `n` bulan kalender ke tanggal ISO (`YYYY-MM-DD`).
 *
 * Akhir bulan dijepit, bukan diluberkan: 31 Januari + 1 bulan = 28/29 Februari, BUKAN 2/3
 * Maret. `Date.setUTCMonth` sendiri meluber, dan luberan itu akan membuat siklus seorang anak
 * bergeser maju sehari setiap beberapa bulan — pergeseran yang tak pernah dikoreksi.
 */
export function tambahBulan(iso: string, n: number): string {
  const [y, m, d] = (iso ?? '').split('-').map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  const total = (m - 1) + Math.floor(n);
  const tahun = y + Math.floor(total / 12);
  const bulan = ((total % 12) + 12) % 12;                       // 0..11
  const akhir = new Date(Date.UTC(tahun, bulan + 1, 0)).getUTCDate();   // hari terakhir bulan itu
  const hari = Math.min(d, akhir);
  return `${String(tahun).padStart(4, '0')}-${String(bulan + 1).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
}

/** Berapa bulan KALENDER PENUH yang sudah lewat dari `dari` sampai `sampai`. */
export function bulanPenuhLewat(dari: string, sampai: string): number {
  const [y1, m1, d1] = (dari ?? '').split('-').map(Number);
  const [y2, m2, d2] = (sampai ?? '').split('-').map(Number);
  if ([y1, m1, d1, y2, m2, d2].some((x) => !Number.isFinite(x))) return 0;
  let n = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) n--;                       // belum sampai tanggal yang sama
  return Math.max(0, n);
}

export interface SiklusArgs {
  /** `langganan_anak.kurikulum_mulai`. Null = jam kurikulumnya belum jalan. */
  mulai: string | null;
  /** Hari ini dalam WIB (`tanggalWIB()`). */
  hariIni: string;
  /** `langganan_anak.bulan_kurikulum` — TOTAL bulan yang sudah dibayar. */
  bulanDibayar: number;
}

/**
 * Siklus kurikulum yang sedang berjalan, beserta tanggal mulainya.
 *
 * `min(kalender, dibayar)` menahan dari dua arah, dan keduanya perlu:
 *   • tanpa batas KALENDER, pelanggan tahunan membuka 12 bulan sekaligus;
 *   • tanpa batas DIBAYAR, anak yang berhenti berlangganan tetap naik tiap bulan — padahal
 *     keputusan pemilik: bulan yang tidak aktif tidak menambah hitungan.
 *
 * Minimal selalu 1: trial & Basic pun menjalani bulan ke-1 (mereka tak pernah naik, karena
 * `bulanDibayar`-nya tak pernah bertambah).
 *
 * `mulai` KOSONG berarti jam kurikulumnya belum tersimpan — praktisnya: migrasi 0104 belum
 * dijalankan. Di keadaan itu sengaja dipakai PERILAKU LAMA (siklus = bulan yang sudah
 * dibayar), bukan siklus 1. Memilih 1 akan mengunci tema bulan ke-2 dan seterusnya untuk
 * anak yang tadinya sudah membukanya, dan konten yang mendadak terkunci terbaca sebagai
 * fitur dicabut — bukan sebagai migrasi yang belum jalan.
 */
export function siklusBerjalan(
  { mulai, hariIni, bulanDibayar }: SiklusArgs,
): { siklus: number; kalenderKe: number; mulaiSiklus: string } {
  const batasBayar = Math.max(1, Math.floor(Number(bulanDibayar) || 0));
  if (!mulai) return { siklus: batasBayar, kalenderKe: batasBayar, mulaiSiklus: hariIni };
  const kalenderKe = bulanPenuhLewat(mulai, hariIni) + 1;
  const siklus = Math.max(1, Math.min(kalenderKe, batasBayar));
  // ⚠️ JANGKAR PEMBEKUAN memakai `kalenderKe`, BUKAN `siklus`.
  //
  // Versi pertama memakai `siklus - 1`, dan itu keliru untuk anak yang jam bayarnya
  // TERTAHAN: anak yang mulai 12 bulan lalu tapi baru membayar 1 bulan akan memakai jangkar
  // 12 bulan yang lalu, sehingga umurnya dibekukan pada umur SETAHUN LALU. Anak yang hari
  // ini berusia 6 tahun dihitung 5 tahun, jatuh ke luar semua kategori usia, dan SELURUH
  // temanya terkunci — tepat gejala yang dilaporkan pemilik.
  //
  // Pembekuan dimaksudkan menahan umur SELAMA satu periode berjalan, bukan memakukannya di
  // masa lalu. Yang ditahan oleh bayaran adalah NOMOR bulan kurikulum (`siklus`), sedangkan
  // periode yang sedang dijalani anak tetap periode kalender hari ini.
  return { siklus, kalenderKe, mulaiSiklus: tambahBulan(mulai, kalenderKe - 1) };
}

/**
 * Bracket usia untuk sebuah umur.
 *
 * Bila rentang kategori BERTUMPUK (mis. 1–3 th dan 3–6 th sama-sama memuat usia 3), yang
 * dipilih adalah yang PALING SEMPIT — kategori yang lebih spesifik lebih mungkin merupakan
 * maksud admin. Seri dipecah oleh `usia_min` lalu `id`, supaya hasilnya deterministik dan
 * tidak berubah hanya karena urutan baris dari basis data berubah.
 */
export function bracketUntukUmur(kategori: BracketUsia[], umur: number): string {
  const u = Math.floor(Number(umur));
  if (!Number.isFinite(u)) return TANPA_BRACKET;
  const cocok = (kategori ?? []).filter((k) => u >= Number(k.usia_min) && u <= Number(k.usia_max));
  if (cocok.length === 0) return TANPA_BRACKET;
  cocok.sort((a, b) =>
    (Number(a.usia_max) - Number(a.usia_min)) - (Number(b.usia_max) - Number(b.usia_min))
    || Number(a.usia_min) - Number(b.usia_min)
    || String(a.id).localeCompare(String(b.id)));
  return cocok[0].id;
}

export interface KonteksArgs extends SiklusArgs {
  /** `anak.tanggal_lahir` (ISO). Null = tak bisa dihitung → semua tema dianggap cocok usia. */
  lahir: string | null;
  kategori: BracketUsia[];
}

export interface KonteksKurikulum {
  /** Nomor siklus keseluruhan (bulan ke-berapa anak ini berjalan sejak mulai). */
  siklus: number;
  /**
   * Periode kalender ke-berapa sejak `kurikulum_mulai` — bisa LEBIH BESAR dari `siklus`
   * bila bulan berbayarnya tertahan. Dipakai sebagai jangkar pembekuan umur.
   */
  kalenderKe: number;
  /** Tanggal awal siklus berjalan — acuan pembekuan. */
  mulaiSiklus: string;
  /** Umur anak PADA AWAL siklus berjalan. NaN bila tanggal lahir kosong. */
  umurBeku: number;
  /** Kategori usia yang dibekukan untuk siklus berjalan. */
  bracket: string;
  /** Bulan ke-berapa anak ini DI DALAM bracket berjalan (1..n). */
  bulanDalamBracket: number;
  /**
   * Bulan tertinggi yang pernah dicapai anak ini di setiap bracket yang sudah dilaluinya.
   * Dipakai agar tema bracket LAMA tetap terbuka — keputusan pemilik: tema yang sudah
   * terbuka tetap terbuka selamanya.
   */
  maksBulan: Record<string, number>;
}

/** Batas waras penelusuran siklus: 50 tahun. Anak 0–6 tahun tak mungkin melampauinya. */
const MAKS_SIKLUS = 600;

/**
 * Konteks kurikulum lengkap seorang anak: siklus berjalan, bracket beku, dan bulan
 * ke-berapa ia berada di dalam bracket itu.
 *
 * Cara kerjanya: siklus 1..n ditelusuri, dan untuk setiap siklus umur anak dihitung pada
 * TANGGAL AWAL siklus itu. Karena umur hanya bertambah, siklus-siklus dalam satu bracket
 * selalu berurutan, jadi jumlah siklus di sebuah bracket = nomor bulan di bracket itu.
 *
 * Penelusuran ini sengaja tidak disimpan: satu-satunya keadaan yang tersimpan adalah tanggal
 * mulai dan jumlah bulan dibayar. Penghitung yang disimpan akan meleset begitu ada koreksi
 * manual, refund, atau backfill — dan melesetnya tak terlihat sampai orang tua mengeluh.
 */
export function konteksKurikulum({ lahir, mulai, hariIni, bulanDibayar, kategori }: KonteksArgs): KonteksKurikulum {
  const { siklus, kalenderKe, mulaiSiklus } = siklusBerjalan({ mulai, hariIni, bulanDibayar });
  const umurPada = (tgl: string): number =>
    lahir ? umurTahun(new Date(lahir + 'T00:00:00Z'), new Date(tgl + 'T00:00:00Z')) : NaN;

  // Ditelusuri sepanjang periode yang BENAR-BENAR DIJALANI anak (kalender), bukan sepanjang
  // bulan yang dibayar — kalau tidak, anak yang bayarannya tertahan akan tercatat masih
  // berada di kategori usianya SETAHUN LALU.
  //
  // Bulan berbayar DIBAGIKAN menurut URUTAN WAKTU, dan totalnya dibatasi `siklus`.
  //
  // 🐞 Versi sebelumnya membatasi PER KATEGORI (`min(dijalani[b], siklus)`), dan itu bocor:
  // batas 3 bulan berlaku untuk Baby DAN untuk Batita, sehingga anak yang membayar 3 bulan
  // lalu berhenti tetap membuka bundel bulanan keempat & kelima begitu kategorinya berganti.
  // Keputusan pemilik: 3 bulan dibayar = Baby 1, Baby 2, Batita 1 — lalu BERHENTI sampai ada
  // pembayaran berikutnya, yang membuka Batita 2.
  //
  // `bracket` tetap kategori HARI INI, apa pun hak bayarnya: hak menentukan berapa bulan yang
  // terbuka, bukan di kategori mana anak itu berada.
  const maksBulan: Record<string, number> = {};
  const batas = Math.min(kalenderKe, MAKS_SIKLUS);
  let bracket = TANPA_BRACKET;
  let diberikan = 0;
  for (let c = 1; c <= batas; c++) {
    const awalC = mulai ? tambahBulan(mulai, c - 1) : hariIni;
    bracket = bracketUntukUmur(kategori, umurPada(awalC));
    // Bulan yang dijalani TANPA kategori usia tidak menghabiskan hak bayar: di sana tak ada
    // kurikulum untuk dikonsumsi. Tanpa aturan ini, anak yang usianya sempat berada di celah
    // antar-kategori membakar bulan berbayarnya pada periode yang tak memberinya tema apa pun
    // — ia membayar dan tetap tak menerima apa-apa.
    if (bracket === TANPA_BRACKET) continue;
    if (diberikan >= siklus) continue;          // bulan ini belum dibayar
    maksBulan[bracket] = (maksBulan[bracket] ?? 0) + 1;
    diberikan++;
  }

  return {
    siklus,
    kalenderKe,
    mulaiSiklus,
    umurBeku: umurPada(mulaiSiklus),
    bracket,
    // Minimal 1 supaya layar tak pernah menulis "bulan ke-0". Anak yang baru berganti
    // kategori tapi bulannya belum terbayar berada di ambang bulan ke-1 kategori itu —
    // temanya tetap terkunci, karena `maksBulan[bracket]` memang masih 0.
    bulanDalamBracket: Math.max(1, maksBulan[bracket] ?? 0),
    maksBulan,
  };
}

/**
 * KENAPA sebuah tema terkunci untuk anak ini — `null` bila tidak terkunci.
 *
 *   'usia'  → tema ini bukan untuk kategori usia anak. MENUNGGU TAK AKAN MEMBUKANYA.
 *   'bulan' → tema kategori yang sedang dijalani, tapi bulannya belum tiba.
 *
 * Dipisah karena pesannya di layar TIDAK BOLEH tertukar: pesan "menunggu bulan berikutnya"
 * pada tema yang terkunci karena usia adalah janji yang tak akan pernah ditepati — orang tua
 * akan menunggu sesuatu yang tak akan datang, lalu menyimpulkan aplikasinya rusak.
 */
export function kunciKarena(tema: TemaBracket, ctx: KonteksKurikulum): 'usia' | 'bulan' | null {
  const st = statusTemaBracket(tema, ctx);
  if (st === 'terbuka') return null;
  const kat = (tema?.kategori_usia_id ?? TANPA_BRACKET) || TANPA_BRACKET;
  if (kat === TANPA_BRACKET) return 'bulan';        // materi lama: hanya digerbangi bulan…
  // Tema di kategori yang SEDANG dijalani anak tak pernah terkunci karena usia — sebabnya
  // waktu/bayaran. Ini penting saat anak baru berganti kategori tapi bulannya belum
  // terbayar: `maksBulan` untuk kategori itu masih 0, dan tanpa cabang ini sebabnya akan
  // dilaporkan 'usia' — keliru, dan membuat layar menyebut alasan yang salah.
  if (kat === ctx.bracket) return 'bulan';
  return (ctx.maksBulan[kat] ?? 0) > 0 ? 'bulan' : 'usia';
}

/**
 * Adakah tema untuk kategori usia yang sedang dijalani anak ini?
 *
 * Bila TIDAK, layarnya wajib mengatakan itu: kategori usia yang belum diisi materinya adalah
 * kekosongan ISI yang harus diperbaiki admin, bukan keadaan yang bisa ditunggu orang tua.
 */
export function adaTemaUntukBracket(list: TemaBracket[] | null | undefined, ctx: KonteksKurikulum): boolean {
  return (list ?? []).some((t) => ((t?.kategori_usia_id ?? TANPA_BRACKET) || TANPA_BRACKET) === ctx.bracket);
}

/** Bentuk tema yang dibutuhkan untuk penggerbangan per bracket. */
export interface TemaBracket {
  bulan_kurikulum?: number | null;
  kategori_usia_id?: string | null;
  usia_min?: number | null;
  usia_max?: number | null;
}

export type StatusBracket = 'terbuka' | 'kunci-judul' | 'terkunci';

/**
 * Status sebuah tema untuk seorang anak, memakai konteks yang sudah dibekukan.
 *
 * Dua jalur, supaya materi lama tidak ikut mati:
 *   • tema BER-KATEGORI digerbangi per bracket — ia hanya berlaku untuk anak yang pernah
 *     berada di kategori itu, dan sampai bulan tertinggi yang anak itu capai di sana;
 *   • tema TANPA kategori (materi sebelum 0101) tetap memakai rentang usianya, tapi
 *     dicocokkan dengan UMUR BEKU — bukan umur hari ini. Dengan begitu pembekuan tetap
 *     berlaku untuk mereka tanpa perlu dikategorikan dulu.
 *
 * Tema tanpa `bulan_kurikulum` dianggap terbuka: default yang salah arah di sini akan
 * mengunci konten yang tadinya sudah jalan, dan itu terbaca sebagai fitur dicabut.
 */
export function statusTemaBracket(tema: TemaBracket, ctx: KonteksKurikulum): StatusBracket {
  const kat = (tema?.kategori_usia_id ?? TANPA_BRACKET) || TANPA_BRACKET;
  const bulan = Math.floor(Number(tema?.bulan_kurikulum) || 0);

  if (kat === TANPA_BRACKET) {
    // Materi lama: rentang usia vs umur beku.
    const u = ctx.umurBeku;
    const min = tema?.usia_min;
    const max = tema?.usia_max;
    const adaMin = min !== null && min !== undefined && Number.isFinite(Number(min));
    const adaMax = max !== null && max !== undefined && Number.isFinite(Number(max));
    const terbalik = adaMin && adaMax && Number(min) > Number(max);
    const cocok = !Number.isFinite(u) || terbalik
      || ((!adaMin || u >= Number(min)) && (!adaMax || u <= Number(max)));
    if (!cocok) return 'terkunci';
    if (bulan < 1) return 'terbuka';
    // Digerbangi oleh SIKLUS KESELURUHAN, bukan hitungan per bracket. Materi tanpa kategori
    // memang tak ikut kadensa per-kategori — kalau ia dihitung sebagai bracket tersendiri,
    // anak yang selalu cocok ke sebuah kategori akan punya hitungan 0 di sini, dan SEMUA
    // materi lama terkunci selamanya. Itu perilaku yang tadinya jalan lalu mati diam-diam.
    const capai = ctx.siklus;
    if (bulan <= capai) return 'terbuka';
    if (bulan === capai + 1) return 'kunci-judul';
    return 'terkunci';
  }

  const capai = ctx.maksBulan[kat] ?? 0;
  // Kategori yang belum pernah dijalani anak ini (dan bukan kategorinya sekarang) tertutup
  // seluruhnya — termasuk materi lama tanpa nomor bulan.
  if (capai === 0 && kat !== ctx.bracket) return 'terkunci';
  // 🐞 Tema BER-KATEGORI tanpa posisi (bulan < 1) TIDAK dianggap terbuka.
  //
  // "Tanpa posisi = terbuka" adalah kelonggaran untuk materi LAMA dari sebelum 0098 — dan
  // materi lama itu tak punya kategori, jadi ia lewat jalur TANPA_BRACKET di atas, bukan
  // jalur ini. Baris ber-kategori dengan bulan 0 hanya bisa lahir dari kekeliruan
  // penyimpanan (mis. materi EVENT yang tersimpan sebelum kolom `jenis` ada), dan
  // memperlakukannya sebagai terbuka membuat materi yang TIDAK dimaksudkan untuk orang tua
  // melewati SELURUH penggerbangan kurikulum.
  if (bulan < 1) return 'terkunci';
  if (bulan <= capai) return 'terbuka';
  // Judul bulan depan hanya diperlihatkan untuk kategori yang SEDANG dijalani; kategori
  // lama tak punya "bulan depan" — anak itu sudah meninggalkannya. Termasuk keadaan
  // `capai === 0`: anak yang baru berganti kategori melihat judul bulan ke-1 kategori
  // barunya, dan itu jujur — ia memang menunggu, bukan salah usia.
  if (kat === ctx.bracket && bulan === capai + 1) return 'kunci-judul';
  return 'terkunci';
}

const urut = (a: TemaBracket & { urutan?: number | null }, b: TemaBracket & { urutan?: number | null }) =>
  (Number(a.bulan_kurikulum) || 0) - (Number(b.bulan_kurikulum) || 0)
  || (Number(a.urutan) || 0) - (Number(b.urutan) || 0);

/**
 * Pisahkan daftar tema menurut konteks kurikulum SEORANG anak.
 *
 * `bulanIni` hanya berisi tema bulan berjalan DI BRACKET BERJALAN — tema bracket lama yang
 * masih terbuka masuk `sudahTerbuka`, karena ia bukan lagi tugas bulan ini. `terkunci`
 * memuat semua yang belum terbuka (termasuk yang hanya boleh tampil judulnya), diurutkan
 * dari yang paling dekat: aturan repo ini membatasi dengan kunci, bukan dengan
 * menyembunyikan.
 */
export function kelompokTemaBracket<T extends TemaBracket & { urutan?: number | null }>(
  list: T[], ctx: KonteksKurikulum,
): {
  bulanIni: T[]; sudahTerbuka: T[]; bulanDepan: T[]; terkunci: T[];
  /** terkunci karena BELUM WAKTUNYA — menunggu akan membukanya */
  terkunciBulan: T[];
  /** terkunci karena BUKAN UNTUK USIANYA — menunggu TIDAK akan membukanya */
  terkunciUsia: T[];
} {
  const bulanIni: T[] = [];
  const sudahTerbuka: T[] = [];
  const bulanDepan: T[] = [];
  const terkunci: T[] = [];
  const terkunciBulan: T[] = [];
  const terkunciUsia: T[] = [];
  for (const tema of list ?? []) {
    const st = statusTemaBracket(tema, ctx);
    if (st !== 'terbuka') {
      (kunciKarena(tema, ctx) === 'usia' ? terkunciUsia : terkunciBulan).push(tema);
    }
    if (st === 'terkunci') { terkunci.push(tema); continue; }
    if (st === 'kunci-judul') { bulanDepan.push(tema); terkunci.push(tema); continue; }
    const kat = (tema.kategori_usia_id ?? TANPA_BRACKET) || TANPA_BRACKET;
    const bulan = Math.floor(Number(tema.bulan_kurikulum) || 0);
    const bulanBerjalan = kat === TANPA_BRACKET ? ctx.siklus : ctx.bulanDalamBracket;
    if (kat === ctx.bracket && bulan === bulanBerjalan) bulanIni.push(tema);
    else sudahTerbuka.push(tema);
  }
  return {
    bulanIni: bulanIni.sort(urut),
    // NAIK, dari bulan 1 minggu 1. Sebelumnya diurutkan dari yang terbaru dengan alasan
    // "bulan lalu lebih relevan" — tapi daftar ini adalah PETUNJUK URUTAN MENGERJAKAN, dan
    // urutan menurun justru menyarankan orang tua memulai dari yang paling akhir.
    sudahTerbuka: sudahTerbuka.sort(urut),
    bulanDepan: bulanDepan.sort(urut),
    terkunci: terkunci.sort(urut),
    terkunciBulan: terkunciBulan.sort(urut),
    terkunciUsia: terkunciUsia.sort(urut),
  };
}

/**
 * Buang tema yang TIDAK punya kategori usia — tapi hanya bila kategorinya memang sudah
 * dipakai.
 *
 * Keputusan pemilik: anak hanya menerima tema yang sesuai KATEGORINYA; tema tanpa kategori
 * tak perlu ditampilkan. Setelah 0101 setiap tema semestinya berkategori, jadi yang tanpa
 * kategori adalah materi yang belum selesai disiapkan admin.
 *
 * Penjagaannya penting: bila TAK SATU PUN tema punya kategori — praktisnya, migrasi 0101
 * belum dijalankan sehingga kolomnya tak terbaca — daftarnya dikembalikan UTUH. Tanpa
 * penjagaan itu, satu migrasi yang belum jalan akan mengosongkan seluruh Ide Bermain, dan
 * konten yang mendadak hilang terbaca sebagai fitur dicabut.
 */
export function saringBerkategori<T extends { kategori_usia_id?: string | null }>(list: T[] | null | undefined): T[] {
  const semua = list ?? [];
  const adaYangBerkategori = semua.some((t) => !!t.kategori_usia_id);
  if (!adaYangBerkategori) return semua;
  return semua.filter((t) => !!t.kategori_usia_id);
}
