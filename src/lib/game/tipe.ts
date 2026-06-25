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
  butir: DataTekan | DataSeret | DataCocok;
}

export interface HasilSelesai {
  benar: number;
  total: number;
  durasiDetik: number;
}
