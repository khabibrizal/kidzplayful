// src/lib/game/tipe.ts
export type Mesin = 'tekan-sesuai' | 'seret-wadah' | 'cari-pasangan' | 'mewarnai';

export interface ButirTekan { tanya: string; benar: string; salah: string[]; }
export interface DataTekan { soal: ButirTekan[]; }

export interface Wadah { kategori: string; label: string; emoji: string; }
export interface Benda { emoji: string; kategori: string; }
export interface DataSeret { wadah: Wadah[]; benda: Benda[]; }

export interface DataCocok { pasangan: string[]; }

export interface DataMewarnai {
  template: string;                    // id template bawaan
  palette: string[];                   // pilihan warna (hex)
  mode: 'bebas' | 'sesuai';
  target?: Record<string, string>;     // areaId -> hex (mode 'sesuai')
}

export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  usia_min: number;
  usia_max: number;
  butir: DataTekan | DataSeret | DataCocok | DataMewarnai;
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
}

export interface TemaInfo {
  id: string;
  nama: string;
  sampul: string | null;
  is_minggu_ini: boolean;
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
  status: 'tampil' | 'arsip';
}

export interface PendaftaranEvent {
  id: string;
  event_id: string;
  ortu_id: string;
  anak_ids: string[];
  anak_nama: string[];
  jumlah_anak: number;
  total: number;
  bukti_url: string | null;
  status: 'menunggu' | 'diterima' | 'ditolak';
  created_at: string;
}

// ===== STORE =====
export interface Produk {
  id: string;
  nama: string;
  deskripsi: string | null;
  kategori: string | null;
  harga: number;
  stok: number;
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
