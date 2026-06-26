// src/lib/game/tipe.ts
export type Mesin = 'tekan-sesuai' | 'seret-wadah' | 'cari-pasangan';

export interface ButirTekan { tanya: string; benar: string; salah: string[]; }
export interface DataTekan { soal: ButirTekan[]; }

export interface Wadah { kategori: string; label: string; emoji: string; }
export interface Benda { emoji: string; kategori: string; }
export interface DataSeret { wadah: Wadah[]; benda: Benda[]; }

export interface DataCocok { pasangan: string[]; }

export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  usia_min: number;
  usia_max: number;
  butir: DataTekan | DataSeret | DataCocok;
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
  materi: string | null;
  bahan: string | null;
  langkah: string[];
  worksheet_url: string | null;
  link_ide: string | null;
}
export interface TemaPanduan {
  tema: TemaInfo;
  panduan: Panduan | null;
}
