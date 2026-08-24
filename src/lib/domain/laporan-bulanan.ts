// src/lib/domain/laporan-bulanan.ts — agregasi rapor bulanan (murni, tanpa I/O).
//
// Semua batas waktu memakai **WIB**: rapor "Agustus" harus berisi kegiatan tanggal 1–31
// menurut jam Indonesia, bukan UTC — kalau tidak, kegiatan malam tanggal 31 pindah ke bulan
// berikutnya dan orang tua akan mengira catatannya hilang.

const MENIT = 60 * 1000;
const OFFSET_WIB = 7 * 60 * MENIT;

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Pecah 'YYYY-MM' menjadi angka; tak sah → bulan berjalan. */
function pecah(ym: string, sekarang = new Date()): { tahun: number; bulan: number } {
  const m = /^(\d{4})-(\d{2})$/.exec((ym ?? '').trim());
  if (!m) {
    const wib = new Date(sekarang.getTime() + OFFSET_WIB);
    return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth() + 1 };
  }
  const bulan = Math.min(12, Math.max(1, Number(m[2])));
  return { tahun: Number(m[1]), bulan };
}

/** Batas awal & akhir sebuah bulan WIB, sebagai ISO string untuk query. */
export function rentangBulan(ym: string, sekarang = new Date()): { dari: string; sampai: string } {
  const { tahun, bulan } = pecah(ym, sekarang);
  const awalWib = Date.UTC(tahun, bulan - 1, 1);
  const akhirWib = Date.UTC(bulan === 12 ? tahun + 1 : tahun, bulan === 12 ? 0 : bulan, 1);
  return {
    dari: new Date(awalWib - OFFSET_WIB).toISOString(),
    sampai: new Date(akhirWib - OFFSET_WIB).toISOString(),
  };
}

export function labelBulan(ym: string, sekarang = new Date()): string {
  const { tahun, bulan } = pecah(ym, sekarang);
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

/** N bulan terakhir (terbaru dulu) dalam format 'YYYY-MM', menurut WIB. */
export function bulanTerakhir(sekarang: Date, n: number): string[] {
  const wib = new Date(sekarang.getTime() + OFFSET_WIB);
  const out: string[] = [];
  let t = wib.getUTCFullYear();
  let b = wib.getUTCMonth() + 1;
  for (let i = 0; i < Math.max(1, n); i++) {
    out.push(`${t}-${String(b).padStart(2, '0')}`);
    b -= 1;
    if (b === 0) { b = 12; t -= 1; }
  }
  return out;
}

export interface KegiatanRingkas { jenis: 'ide-bermain' | 'video'; judul: string | null; waktu: string }
export interface HasilMainRingkas { area_skill: string | null; bintang: number | null; durasi_detik: number | null; selesai: boolean | null }
/** Satu baris penilaian: area + indikator + kode skala PAUD (BB/MB/BSH/BSB). */
export interface NilaiRingkas { area: string; indikator: string; nilai: string }

export interface CatatanRingkas {
  judulEvent: string;
  dinilai_oleh: string | null;
  /** isi penilaian per indikator — inilah "catatan perkembangan" yang sesungguhnya */
  penilaian: NilaiRingkas[];
  /** catatan bebas dari guru */
  catatan: string | null;
}

/** Rekomendasi naratif psikolog dari sesi konsultasi. */
export interface RekomendasiRingkas {
  judul: string | null;
  isi: string | null;
  butir: { judul: string | null; isi: string | null }[];
  oleh: string | null;
}

/** Rekomendasi item: produk / event / ide bermain (materi). */
export interface ItemRingkas {
  jenis: 'produk' | 'event' | 'materi';
  judul: string | null;
  catatan: string | null;
  oleh: string | null;
}

/**
 * Evaluasi kurikulum satu tema pada periode ini (0098).
 *
 * `peran` ikut dibawa karena "dinilai orang tua" dan "dinilai guru" TIDAK setara sebagai
 * bukti — rapor harus menyebutnya, bukan meleburkannya.
 */
export interface EvaluasiRingkas {
  judulTema: string;
  tercapai: number;
  total: number;
  peran: string;
  dinilaiOleh: string | null;
  /** butir yang BELUM tercapai — inilah yang berguna untuk langkah berikutnya */
  belum: string[];
  /** posisi kurikulum; null untuk materi lama yang tak punya bulan */
  bulan?: number | null;
  minggu?: number | null;
  /** rincian per aktivitas — nama tema saja tak cukup untuk tahu bagian mana yang dikuasai */
  perAktivitas?: { aktivitas: string; tercapai: number; total: number }[];
}

export interface RingkasanBulan {
  totalKegiatan: number;
  ideBermain: number;
  video: number;
  daftarIdeBermain: { judul: string; jumlah: number }[];
  daftarVideo: { judul: string; jumlah: number }[];
  totalSesi: number;
  totalBintang: number;
  totalMenit: number;
  perArea: Record<string, number>;
  areaTerbanyak: string | null;
  /**
   * TOTAL aktivitas bulan itu: Ide Bermain + video + sesi game.
   *
   * Menggantikan "total waktu main" sebagai angka utama keempat. Durasi hanya tercatat untuk
   * sesi game (`hasil_main.durasi_detik`) — `kegiatan_anak` tak punya kolom durasi sama
   * sekali — jadi "waktu main" tak pernah bisa mewakili seluruh aktivitas, dan menampilkannya
   * sebagai angka utama membuat rapor anak yang aktif berbunyi "0 m".
   */
  totalAktivitas: number;
  /** kalimat asal-usul `areaTerbanyak`, supaya angkanya bisa dipertanggungjawabkan */
  areaDariMana: string;
  /**
   * KUNCI area teratas, mentah & belum digabung (`['motorik-halus','kognitif']`).
   *
   * `areaTerbanyak` sudah berupa label gabungan, dan kunci mentahnya masih dibutuhkan karena
   * halaman rapor menerjemahkan tiap kunci lewat `LABEL_AREA` sebelum ditampilkan —
   * menerjemahkan string yang SUDAH digabung tak akan pernah cocok, dan orang tua akan
   * membaca "motorik-halus & kognitif" alih-alih "Motorik Halus & Kognitif".
   */
  areaTeratas: string[];
  catatanGuru: CatatanRingkas[];
  event: string[];
  /** jumlah sesi konsultasi pada periode ini */
  rekomendasi: number;
  /** rekomendasi naratif psikolog pada periode ini */
  rekomendasiPsikolog: RekomendasiRingkas[];
  /** produk / event / ide bermain yang direkomendasikan pada periode ini */
  rekomendasiItem: ItemRingkas[];
  /** checklist evaluasi kurikulum yang disimpan pada periode ini */
  evaluasi: EvaluasiRingkas[];
  /** true bila bulan itu punya sesuatu untuk ditampilkan */
  adaIsi: boolean;
}

function kelompok(items: KegiatanRingkas[]): { judul: string; jumlah: number }[] {
  const m = new Map<string, number>();
  for (const k of items) {
    const j = (k.judul ?? '').trim() || 'Tanpa judul';
    m.set(j, (m.get(j) ?? 0) + 1);
  }
  return [...m.entries()].map(([judul, jumlah]) => ({ judul, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah || a.judul.localeCompare(b.judul));
}

/**
 * Dari mana "area yang paling dilatih" dihitung.
 *
 * 🐞 Sebelumnya HANYA dari `hasil_main.area_skill` — yakni sesi game. Anak yang bulan itu
 * mengerjakan 9 Ide Bermain tapi tak menyentuh game satu kali pun mendapat "Belum ada data",
 * padahal di rapor yang SAMA sudah tercetak empat domain perkembangan dari catatan guru.
 * Angkanya benar, definisinya yang terlalu sempit.
 *
 * Tiga sumber digabung karena ketiganya memang menyatakan area yang dilatih:
 *   • `ideBermain` — `fokus_area` tema yang dikerjakan di rumah (satu array per kegiatan,
 *      sebab satu tema bisa melatih beberapa area sekaligus);
 *   • `catatan`    — area pada penilaian guru di event;
 *   • `game`       — `area_skill` sesi game, sumber yang lama.
 */
export interface SumberArea {
  ideBermain: (string[] | null | undefined)[];
  catatan: (string | null | undefined)[];
  game: (string | null | undefined)[];
}

export interface HasilArea {
  perArea: Record<string, number>;
  /** area dengan hitungan tertinggi — bisa lebih dari satu bila SERI */
  terbanyak: string[];
  /** label siap tampil, mis. "Motorik kasar & Bahasa"; null bila tak ada sumber sama sekali */
  label: string | null;
  /** kalimat asal-usul angkanya, mis. "dihitung dari 9 ide bermain & 5 sesi game" */
  dariMana: string;
}

/** Berapa area teratas yang ikut ditulis di label sebelum sisanya diringkas. */
const MAKS_AREA_LABEL = 2;

export function hitungArea(s: SumberArea | null | undefined): HasilArea {
  const perArea: Record<string, number> = {};
  const tambah = (a: string | null | undefined) => {
    const k = (a ?? '').trim();
    if (k) perArea[k] = (perArea[k] ?? 0) + 1;
  };
  // Yang dihitung adalah kegiatan yang BENAR-BENAR menyumbang area. `[' ']` panjangnya 1
  // tapi tak menyumbang apa pun, dan menghitungnya membuat kalimat asal-usul mengklaim
  // "dihitung dari 2 ide bermain" padahal tak satu pun area berasal dari sana.
  const ide = (s?.ideBermain ?? []).filter((x) => (x ?? []).some((a) => (a ?? '').trim()));
  for (const arr of s?.ideBermain ?? []) for (const a of arr ?? []) tambah(a);
  const cat = (s?.catatan ?? []).filter((x) => (x ?? '').trim());
  for (const a of cat) tambah(a);
  const gm = (s?.game ?? []).filter((x) => (x ?? '').trim());
  for (const a of gm) tambah(a);

  const urut = Object.entries(perArea).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const puncak = urut[0]?.[1] ?? 0;
  // SERI diakui, tidak dipaksa jadi satu: dua area yang sama-sama tertinggi adalah kabar
  // yang lebih benar daripada memilih salah satu berdasarkan urutan abjad.
  const terbanyak = urut.filter(([, n]) => n === puncak).map(([a]) => a);

  const bagian: string[] = [];
  if (ide.length) bagian.push(`${ide.length} ide bermain`);
  if (cat.length) bagian.push(`${cat.length} penilaian guru`);
  if (gm.length) bagian.push(`${gm.length} sesi game`);
  const dariMana = bagian.length
    ? `dihitung dari ${bagian.slice(0, -1).join(', ')}${bagian.length > 1 ? ' & ' : ''}${bagian[bagian.length - 1]}`
    : '';

  let label: string | null = null;
  if (terbanyak.length) {
    const tampil = terbanyak.slice(0, MAKS_AREA_LABEL);
    const sisa = terbanyak.length - tampil.length;
    label = tampil.join(' & ') + (sisa > 0 ? ` & ${sisa} lainnya` : '');
  }
  return { perArea, terbanyak, label, dariMana };
}

export function ringkasBulan(input: {
  kegiatan: KegiatanRingkas[];
  hasilMain: HasilMainRingkas[];
  catatan: CatatanRingkas[];
  event: string[];
  rekomendasi: number;
  rekomendasiPsikolog?: RekomendasiRingkas[];
  rekomendasiItem?: ItemRingkas[];
  evaluasi?: EvaluasiRingkas[];
  /** `fokus_area` tema Ide Bermain yang dikerjakan bulan itu — satu array per kegiatan */
  fokusAreaIde?: (string[] | null | undefined)[];
}): RingkasanBulan {
  const keg = input.kegiatan ?? [];
  const ide = keg.filter((k) => k.jenis === 'ide-bermain');
  const vid = keg.filter((k) => k.jenis === 'video');

  const main = input.hasilMain ?? [];
  let bintang = 0;
  let detik = 0;
  for (const h of main) {
    bintang += Math.max(0, Math.floor(Number(h.bintang) || 0));
    detik += Math.max(0, Math.floor(Number(h.durasi_detik) || 0));
  }
  // Area dihitung dari TIGA sumber, bukan hanya sesi game — lihat `hitungArea`.
  const area = hitungArea({
    ideBermain: input.fokusAreaIde ?? [],
    catatan: (input.catatan ?? []).flatMap((c) => (c.penilaian ?? []).map((n) => n.area)),
    game: main.map((h) => h.area_skill),
  });

  return {
    totalKegiatan: keg.length,
    ideBermain: ide.length,
    video: vid.length,
    daftarIdeBermain: kelompok(ide),
    daftarVideo: kelompok(vid),
    totalSesi: main.length,
    totalBintang: bintang,
    totalMenit: Math.round(detik / 60),
    perArea: area.perArea,
    areaTerbanyak: area.label,
    areaTeratas: area.terbanyak,
    totalAktivitas: keg.length + main.length,
    areaDariMana: area.dariMana,
    catatanGuru: input.catatan ?? [],
    event: input.event ?? [],
    rekomendasi: Math.max(0, Math.floor(input.rekomendasi || 0)),
    rekomendasiPsikolog: input.rekomendasiPsikolog ?? [],
    rekomendasiItem: input.rekomendasiItem ?? [],
    evaluasi: input.evaluasi ?? [],
    // Rekomendasi psikolog & item ikut dihitung: bulan tanpa kegiatan mandiri tapi berisi
    // hasil konsultasi TETAP layak dicetak sebagai rapor.
    adaIsi: keg.length > 0 || main.length > 0 || (input.catatan ?? []).length > 0
      || (input.event ?? []).length > 0 || (input.rekomendasiPsikolog ?? []).length > 0
      || (input.rekomendasiItem ?? []).length > 0 || (input.evaluasi ?? []).length > 0,
  };
}

/**
 * Rapikan teks yang berisi daftar dipisah koma untuk DITAMPILKAN.
 *
 * 🐞 Di rapor Agustus 2026 terbaca "Berjalan,melompat,menjaga keseimbangan" — koma tanpa
 * spasi. Sumbernya BUKAN `join(',')` di kode (jalur ini mencetak `indikator` apa adanya),
 * melainkan teks yang diketik admin begitu. Karena itu perapiannya dilakukan saat MENAMPILKAN,
 * bukan dengan mengubah data: memperbaiki datanya hanya menolong baris yang sudah ada, dan
 * baris berikutnya akan salah lagi.
 *
 * Yang dirapikan hanya koma yang menempel ke karakter berikutnya. Angka seperti "1,5" sengaja
 * TIDAK disentuh — memberi spasi di situ akan mengubah arti.
 */
export function rapikanDaftar(teks: string | null | undefined): string {
  return (teks ?? '')
    .replace(/,(?=\S)(?!\d)/g, ', ')   // koma yang menempel, kecuali di depan angka
    .replace(/\s{2,}/g, ' ')
    .trim();
}
