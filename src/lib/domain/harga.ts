// src/lib/domain/harga.ts — pemilihan harga berdasar status langganan (murni)
// Aturan: aktif → harga diskon langganan; selain aktif (trial/tenggang/kadaluarsa) → harga diskon trial.
// Event: diskon HANYA untuk pelanggan aktif.

type ProdukHarga = { harga: number; harga_diskon_trial?: number | null; harga_diskon_langganan?: number | null };
type EventHarga = { harga_per_anak: number; harga_langganan?: number | null };

const valid = (dp: number | null | undefined, normal: number) => (dp && dp > 0 && dp < normal ? dp : null);

/** Harga produk yang berlaku untuk status user (harga aktual yang dibayar). */
export function hargaProdukUntuk(p: ProdukHarga, status: string): number {
  const dp = status === 'aktif' ? valid(p.harga_diskon_langganan, p.harga) : valid(p.harga_diskon_trial, p.harga);
  return dp ?? p.harga;
}

/** Harga event yang berlaku untuk status user (diskon hanya untuk aktif). */
export function hargaEventUntuk(ev: EventHarga, status: string): number {
  const dp = status === 'aktif' ? valid(ev.harga_langganan, ev.harga_per_anak) : null;
  return dp ?? ev.harga_per_anak;
}

/** Diskon trial produk (untuk ditampilkan), null bila tak ada. */
export function diskonTrial(p: ProdukHarga): number | null { return valid(p.harga_diskon_trial, p.harga); }
/** Diskon langganan produk (untuk ditampilkan), null bila tak ada. */
export function diskonLangganan(p: ProdukHarga): number | null { return valid(p.harga_diskon_langganan, p.harga); }
