// src/lib/game/tipe.ts
export type Mesin = 'tekan-sesuai' | 'seret-wadah' | 'cari-pasangan' | 'mewarnai' | 'dekode' | 'urutan' | 'jalur' | 'hitung' | 'cocokkan' | 'ejakata' | 'garis';

export interface ButirTekan { tanya: string; benar: string; salah: string[]; }
export interface DataTekan { soal: ButirTekan[]; }

export interface Wadah { kategori: string; label: string; emoji: string; }
export interface Benda { emoji: string; kategori: string; }
export interface DataSeret { wadah: Wadah[]; benda: Benda[]; }

export interface DataCocok { pasangan: string[]; }

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

// Hitung-Kode: simbol -> angka, lalu operasi +/- (pilihan jawaban angka).
export interface HitungMap { simbol: string; nilai: number; } // simbol: emoji/gambar/#hex; nilai: angka
export interface HitungSoal { kiri: string; kanan: string; operasi: '+' | '-'; }
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

export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  usia_min: number;
  usia_max: number;
  target_detik?: number | null;  // Mode Tantangan: selesai ≤ target = bonus (opsional)
  butir: DataTekan | DataSeret | DataCocok | DataMewarnai | DataDekode | DataUrutan | DataJalur | DataHitung | DataCocokkan | DataEjaKata | DataGaris;
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
  langkah: string[];
}
export interface KelasBermain {
  id: string;
  judul: string;
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
  diskon_langganan_persen: number | null;   // % diskon untuk pelanggan aktif (opsional)
  status: 'tampil' | 'arsip';
  sertifikat_bg_url: string | null; // template sertifikat (JPEG)
  dokumentasi_url: string | null;   // link dokumentasi kegiatan
  stiker_bg_url: string | null;     // template stiker nama (opsional)
}

export interface PendaftaranEvent {
  id: string;
  event_id: string;
  ortu_id: string;
  anak_ids: string[];
  anak_nama: string[];
  hadir_anak_ids: string[]; // anak yang ditandai HADIR (absensi)
  jumlah_anak: number;
  total: number;
  bukti_url: string | null;
  status: 'menunggu' | 'diterima' | 'ditolak';
  created_at: string;
  event_asal_id: string | null;      // event asal bila pendaftaran ini di-reschedule
  alasan_reschedule: string | null;  // alasan reschedule (mis. anak sakit)
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
export interface CatatanPerkembangan {
  id: string;
  event_id: string;
  anak_id: string;
  ortu_id: string;
  aspek: Record<string, string>; // key aspek → kode skala
  catatan: string | null;
  dinilai_oleh: string | null;
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
