// src/lib/game/tipe.ts
export type Mesin = 'tekan-sesuai' | 'seret-wadah' | 'cari-pasangan' | 'mewarnai' | 'dekode' | 'urutan' | 'jalur' | 'hitung' | 'cocokkan' | 'ejakata' | 'garis' | 'sukukata' | 'jiplak' | 'hitung-benda' | 'ingatan';

export interface ButirTekan { tanya: string; benar: string; salah: string[]; }
export interface DataTekan { soal: ButirTekan[]; }

export interface Wadah { kategori: string; label: string; emoji: string; }
export interface Benda { emoji: string; kategori: string; }
export interface DataSeret { wadah: Wadah[]; benda: Benda[]; }

export interface DataCocok { pasangan: string[]; }

// Kartu Ingatan (memory/concentration): kartu tertutup, buka 2, yang sama tetap terbuka.
export interface DataIngatan { pasangan: string[]; } // tiap entri → sepasang kartu

export interface DataMewarnai {
  sumber?: 'template' | 'svg';         // default 'template'
  template?: string;                   // id template bawaan (sumber 'template')
  svg?: string;                        // markup SVG (sumber 'svg', sudah disanitasi)
  palette: string[];                   // pilihan warna (hex)
  mode: 'bebas' | 'sesuai' | 'berkode'; // berkode = color-by-number (nomor = urutan warna target di palette)
  target?: Record<string, string>;     // areaId -> hex (mode 'sesuai'/'berkode')
}

// Dekode ("Pecahkan Kode"): legenda simbol->nilai, anak menerjemahkan sekuens simbol.
export interface DekodeMap { simbol: string; nilai: string; } // simbol: emoji/gambar-URL/#hex; nilai: huruf/angka/kata/emoji
export interface DataDekode { legenda: DekodeMap[]; soal: string[][]; } // tiap soal = urutan 'simbol' (harus ada di legenda)

// Urutan & Pola: 'urutkan' (anak menata item ke urutan benar) / 'pola' (lanjutkan pola).
export interface UrutanSoal {
  urut?: string[];       // tipe 'urutkan': urutan BENAR (ditampilkan teracak)
  petunjuk?: string;     // tipe 'urutkan': hint (mis. "kecil → besar" / "susun: BUKU")
  tampil?: string[];     // tipe 'pola': sekuens yang ditampilkan
  benar?: string;        // tipe 'pola': item berikutnya yang benar
  salah?: string[];      // tipe 'pola': pengecoh
}
export interface DataUrutan { tipe: 'urutkan' | 'pola'; soal: UrutanSoal[]; }

// Arah & Jalur (Robot Grid): anak menyusun perintah arah → karakter jalan ke tujuan.
export interface JalurSoal {
  kolom: number; baris: number;           // ukuran grid
  mulai: [number, number];                // posisi awal [x,y] (kolom,baris) 0-index
  tujuan: [number, number];               // posisi tujuan
  rintangan?: [number, number][];         // sel yang tak boleh dilewati
  karakter?: string;                      // emoji karakter (default 🐢)
  hadiah?: string;                        // emoji tujuan (default 🎯)
}
export interface DataJalur { soal: JalurSoal[]; }

// Hitung-Kode: simbol -> angka, lalu operasi +, −, × (perkalian: 'x'), ÷ (pembagian: ':').
export interface HitungMap { simbol: string; nilai: number; } // simbol: emoji/gambar/#hex; nilai: angka
export type OperasiHitung = '+' | '-' | 'x' | ':';
export interface HitungSoal { kiri: string; kanan: string; operasi: OperasiHitung; }
export interface DataHitung { legenda: HitungMap[]; soal: HitungSoal[]; }

// Cocokkan (asosiasi): pasangkan item kiri dengan pasangannya di kanan.
export interface CocokPair { kiri: string; kanan: string; } // emoji/gambar/#hex/teks
export interface DataCocokkan { pasangan: CocokPair[]; }

// Eja Kata: eja nama benda dari gambar dengan menyusun huruf berurutan.
export interface EjaSoal { gambar?: string; kata: string; pengecoh?: string } // gambar: emoji/URL; kata: target; pengecoh: huruf pengganggu
export interface DataEjaKata { soal: EjaSoal[]; }

// Titik & Garis: hubungkan titik pada grid sesuai contoh (menutup #6 & #24 buku).
export interface GarisSoal { kolom: number; baris: number; garis: [number, number][] } // garis = pasangan indeks titik (idx = y*kolom + x)
export interface DataGaris { soal: GarisSoal[]; }

// ——— Calistung ———
// Rangkai Suku Kata (BACA): susun suku kata jadi kata (mode 'susun') / dengar-pilih fonik (mode 'dengar').
export interface SukuKataSoal {
  kata: string;          // kata target, mis. "buku"
  sukuKata: string[];    // ["bu","ku"] — join('') harus = kata
  pengecoh: string[];    // suku kata pengganggu ["ka","bi"]
  gambar?: string;       // emoji/URL (mode 'susun')
  audio_url?: string;    // override TTS bila diisi rekaman
  mode: 'susun' | 'dengar';
}
export interface DataSukuKata { soal: SukuKataSoal[]; }

// Jiplak Huruf & Angka (TULIS): tracing goresan karakter (path bawaan JALUR_KARAKTER).
export interface JiplakSoal { karakter: string; audio_url?: string } // 1 karakter A–Z a–z 0–9
export interface DataJiplak { soal: JiplakSoal[]; }

// Hitung Benda (HITUNG): tap-hitung benda ('hitung') / bandingkan dua kelompok ('banyak-mana').
export interface HitungBendaSoal {
  benda: string;         // emoji/URL benda
  jumlah: number;        // 1–10
  benda2?: string;       // mode 'banyak-mana'
  jumlah2?: number;      // mode 'banyak-mana' (≠ jumlah)
  mode: 'hitung' | 'banyak-mana';
  audio_url?: string;
}
export interface DataHitungBenda { soal: HitungBendaSoal[]; }

export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  usia_min: number;
  usia_max: number;
  kategori_usia_id?: string | null;  // master Kategori Usia (0079); usia_min/max di-snapshot dari range-nya
  target_detik?: number | null;  // Mode Tantangan: selesai ≤ target = bonus (opsional)
  butir: DataTekan | DataSeret | DataCocok | DataMewarnai | DataDekode | DataUrutan | DataJalur | DataHitung | DataCocokkan | DataEjaKata | DataGaris | DataSukuKata | DataJiplak | DataHitungBenda | DataIngatan;
}

export interface HasilSelesai {
  benar: number;
  total: number;
  durasiDetik: number;
}

export interface Video {
  id: string;
  judul: string;
  youtube_id: string;
  durasi_detik: number;
  kategori: 'baby' | 'toddler';
  boleh_trial?: boolean;
}

export interface TemaInfo {
  id: string;
  nama: string;
  sampul: string | null;
  is_minggu_ini: boolean;
  boleh_trial?: boolean;
}

export interface TemaLengkap {
  tema: TemaInfo;
  paket: Paket[];
  video: Video[];
}

export interface Panduan {
  tema_id: string;
  judul: string | null;
  aktivitas: string | null;
  bahan: string | null;
  cara_membuat: string | null;
  langkah: string[];
  link_ide: string | null;
  worksheet_url: string | null;
}
export interface TemaPanduan {
  tema: TemaInfo;
  panduan: Panduan | null;
}

export interface BahanItem {
  nama: string;
  link: string | null;        // link marketplace EKSTERNAL (opsional)
  produk_id?: string | null;  // produk Store INTERNAL (opsional, diutamakan)
}
export interface AktivitasItem {
  judul: string;
  cara_membuat: string | null;
  langkah: string[];          // urutan cara bermain
  catatan_ortu?: string | null; // catatan/tips untuk orang tua
}
export interface KelasBermain {
  id: string;
  judul: string;
  tujuan?: string | null;   // tujuan pembelajaran kelas ini (utk ortu)
  fokus_area?: string[];    // area perkembangan yang dilatih (motorik-halus, kognitif, …)
  peran_ortu?: string | null; // peran/keterlibatan orang tua saat bermain
  usia_min?: number;        // rentang usia yang disarankan
  usia_max?: number;
  bahan: BahanItem[];
  aktivitas: AktivitasItem[];
  link_ide: string | null;
  worksheet_url: string | null;
  status: 'aktif' | 'nonaktif';
  boleh_trial?: boolean;
}

export interface EventKelas {
  id: string;
  judul: string;
  lokasi: string | null;
  tanggal: string | null; // 'YYYY-MM-DD'
  jam_mulai: string | null;
  jam_selesai: string | null;
  deskripsi: string | null;
  gambar_url: string | null;
  harga_per_anak: number;
  harga_pendamping?: number;                 // biaya tambah 1 pendamping (0 = tak ditawarkan)
  diskon_langganan_persen: number | null;   // % diskon untuk pelanggan aktif (opsional)
  status: 'tampil' | 'arsip';
  sertifikat_bg_url: string | null; // template sertifikat (JPEG)
  dokumentasi_url: string | null;   // link dokumentasi kegiatan
  stiker_bg_url: string | null;     // template stiker nama (opsional)
  indikator_perkembangan?: BarisParam[]; // parameter penilaian tumbuh kembang event ini
  // Kelas terpisah (opsional). Bila jam/tgl kosong → kelas tidak ditawarkan (event gabungan).
  baby_tanggal?: string | null;
  baby_jam_mulai?: string | null;
  baby_jam_selesai?: string | null;
  toddler_tanggal?: string | null;
  toddler_jam_mulai?: string | null;
  toddler_jam_selesai?: string | null;
}

export interface PendaftaranEvent {
  id: string;
  event_id: string;
  ortu_id: string;
  anak_ids: string[];
  anak_nama: string[];
  hadir_anak_ids: string[]; // anak yang ditandai HADIR (absensi)
  jumlah_anak: number;
  jumlah_pendamping?: number;
  total: number;
  bukti_url: string | null;
  status: 'menunggu' | 'diterima' | 'ditolak';
  created_at: string;
  event_asal_id: string | null;      // event asal bila pendaftaran ini di-reschedule
  alasan_reschedule: string | null;  // alasan reschedule (mis. anak sakit)
  alasan_tolak?: string | null;      // alasan penolakan (tampil ke orang tua)
  kelas?: string | null;             // 'baby' | 'toddler' | 'gabungan'
  kelas_jadwal?: string | null;      // snapshot tgl+jam kelas terpilih
}

export interface Sertifikat {
  id: string;
  event_id: string | null;
  anak_id: string;
  ortu_id: string;
  anak_nama: string;
  event_judul: string;
  event_tanggal: string | null;
  lokasi: string | null;
  bg_url: string | null;
  dokumentasi_url: string | null;
  diterbitkan_oleh: string | null;
  created_at: string;
}

// ===== STORE =====
export interface Produk {
  id: string;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  harga: number;
  diskon_trial_persen: number | null;      // % diskon untuk user trial/kadaluarsa (opsional)
  diskon_langganan_persen: number | null;  // % diskon untuk pelanggan aktif (opsional)
  berat_gram: number | null;              // berat (gram) untuk acuan ongkir
  stok: number;                           // sisa stok (berkurang saat pesanan diverifikasi)
  terjual: number;                        // jumlah terjual (bertambah saat pesanan diverifikasi)
  gambar_url: string | null;
  status: 'tampil' | 'arsip';
}
export interface KeranjangItem {
  produk_id: string;
  qty: number;
  produk: Produk;
}
export type StatusPesanan =
  | 'menunggu_ongkir' | 'menunggu_bayar' | 'dibayar' | 'diproses' | 'dikirim' | 'selesai' | 'batal';
export interface ItemPesanan {
  id: string;
  produk_id: string | null;
  nama: string;
  harga: number;
  qty: number;
}
export type SkalaPaud = 'BB' | 'MB' | 'BSH' | 'BSB';
export interface BarisParam { area: string; indikator: string }
export interface BarisNilai extends BarisParam { nilai: string }
export interface CatatanPerkembangan {
  id: string;
  event_id: string;
  anak_id: string;
  ortu_id: string;
  aspek: Record<string, string>; // (legacy) key aspek → kode skala
  penilaian: BarisNilai[];       // snapshot area+indikator+nilai per event
  catatan: string | null;
  dinilai_oleh: string | null;
  created_at: string;
}

// ——— Fitur Chat dengan Psikolog ———
export interface JadwalPsikolog {
  psikolog_id: string;
  nama: string | null;
  hari_buka: number[];        // 0=Minggu .. 6=Sabtu
  jam_mulai: string | null;
  jam_selesai: string | null;
  maks_per_hari: number;
  durasi_menit: number;       // batas durasi 1 sesi konsultasi (0 = tanpa batas)
  aktif: boolean;
  catatan: string | null;
}
export type StatusKonsultasi = 'menunggu' | 'diterima' | 'ditolak' | 'selesai' | 'batal';
export interface PendaftaranKonsultasi {
  id: string;
  ortu_id: string;
  psikolog_id: string;
  anak_id: string;
  anak_nama: string | null;
  tanggal: string;
  jam: string | null;
  keluhan: string | null;
  status: StatusKonsultasi;
  diverifikasi_pada: string | null;
  dimulai_pada: string | null;   // waktu sesi konsultasi dimulai (untuk hitung mundur)
  durasi_menit: number;          // snapshot durasi saat dimulai (0 = tanpa batas)
  created_at: string;
}
export interface PesanKonsultasi {
  id: string;
  pendaftaran_id: string;
  pengirim_id: string;
  nama: string | null;
  teks: string;
  dibaca_at: string | null;
  created_at: string;
}
export interface ButirRekomendasi { judul: string; isi: string }
export interface RekomendasiPsikolog {
  id: string;
  anak_id: string;
  ortu_id: string;
  psikolog_id: string;
  pendaftaran_id: string | null;
  judul: string | null;
  isi: string | null;
  butir: ButirRekomendasi[];
  dinilai_oleh: string | null;
  created_at: string;
}

export type JenisRekomendasi = 'produk' | 'event' | 'materi';
export interface RekomendasiItem {
  id: string;
  anak_id: string;
  ortu_id: string;
  pemberi_id: string;
  pemberi_nama: string | null;
  pendaftaran_id: string | null;
  jenis: JenisRekomendasi;
  ref_id: string;
  judul: string | null;
  catatan: string | null;
  created_at: string;
}

export interface Pesanan {
  id: string;
  ortu_id: string;
  status: StatusPesanan;
  subtotal: number;
  ongkir: number;
  total: number;
  penerima: string | null;
  no_hp: string | null;
  alamat: string | null;
  bukti_url: string | null;
  no_resi: string | null;
  catatan: string | null;
  created_at: string;
  item?: ItemPesanan[];
}
