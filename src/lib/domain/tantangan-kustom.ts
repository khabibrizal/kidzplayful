// src/lib/domain/tantangan-kustom.ts — logika murni tantangan kustom (quest admin)

export type SyaratTipe = 'paket' | 'mesin' | 'tema' | 'apa';
export interface SyaratItem { tipe: SyaratTipe; ref?: string | null; jumlah: number; minBintang: number; }

export interface TantanganKustom {
  id: string;
  judul: string;
  deskripsi: string;
  lencana_kode: string;
  bonus_koin: number;
  syarat: SyaratItem[];
  aktif: boolean;
}

export interface RowMain { mesin: string; tema_id: string | null; paket_id: string | null; bintang: number; }

// label jenis game untuk form admin
export const MESIN_LIST: { value: string; label: string }[] = [
  { value: 'tekan-sesuai', label: 'Mana Ya (tekan-sesuai)' },
  { value: 'seret-wadah', label: 'Beres-Beres (seret-wadah)' },
  { value: 'cari-pasangan', label: 'Cari Pasangan' },
  { value: 'mewarnai', label: 'Mewarnai' },
  { value: 'dekode', label: 'Pecahkan Kode (dekode)' },
  { value: 'urutan', label: 'Urutan & Pola' },
  { value: 'jalur', label: 'Robot Grid (jalur)' },
  { value: 'hitung', label: 'Hitung-Kode' },
  { value: 'cocokkan', label: 'Cocokkan' },
  { value: 'ejakata', label: 'Eja Kata' },
  { value: 'garis', label: 'Titik & Garis' },
];

export function cocokItem(it: SyaratItem, r: RowMain): boolean {
  if (r.bintang < (it.minBintang || 0)) return false;
  if (it.tipe === 'apa') return true;
  if (it.tipe === 'mesin') return r.mesin === it.ref;
  if (it.tipe === 'tema') return r.tema_id === it.ref;
  if (it.tipe === 'paket') return r.paket_id === it.ref;
  return false;
}

export interface ProgresItem { it: SyaratItem; progress: number; target: number; selesai: boolean; }

/** Progres tantangan dari seluruh riwayat main anak. */
export function progresTantanganKustom(syarat: SyaratItem[], rows: RowMain[]): { items: ProgresItem[]; selesai: boolean; done: number; total: number } {
  const items: ProgresItem[] = syarat.map((it) => {
    const count = rows.filter((r) => cocokItem(it, r)).length;
    const target = Math.max(1, it.jumlah || 1);
    return { it, progress: Math.min(count, target), target, selesai: count >= target };
  });
  const done = items.filter((i) => i.selesai).length;
  return { items, selesai: items.length > 0 && done === items.length, done, total: items.length };
}

/** Ringkas syarat jadi teks untuk ditampilkan. */
export function ringkasSyarat(it: SyaratItem, labelPaket?: (ref: string) => string, labelTema?: (ref: string) => string): string {
  const skor = it.minBintang > 0 ? ` (min ${'⭐'.repeat(it.minBintang)})` : '';
  if (it.tipe === 'apa') return `Selesaikan ${it.jumlah} game apa saja${skor}`;
  if (it.tipe === 'mesin') return `Selesaikan ${it.jumlah}× ${MESIN_LIST.find((m) => m.value === it.ref)?.label ?? it.ref}${skor}`;
  if (it.tipe === 'tema') return `Selesaikan ${it.jumlah} game tema "${labelTema?.(it.ref ?? '') ?? it.ref}"${skor}`;
  if (it.tipe === 'paket') return `Selesaikan game "${labelPaket?.(it.ref ?? '') ?? it.ref}" ${it.jumlah}×${skor}`;
  return '';
}
