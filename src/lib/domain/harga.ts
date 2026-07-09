// src/lib/domain/harga.ts — diskon PERSENTASE berdasar status langganan (murni)
// Produk: aktif → diskon langganan; selain aktif (trial/tenggang/kadaluarsa) → diskon trial.
// Event: diskon HANYA untuk pelanggan aktif.

type ProdukHarga = { harga: number; diskon_trial_persen?: number | null; diskon_langganan_persen?: number | null };
type EventHarga = { harga_per_anak: number; diskon_langganan_persen?: number | null };

const clampPersen = (p: number | null | undefined) => Math.min(100, Math.max(0, Math.floor(Number(p) || 0)));

/** Persen diskon produk yang berlaku untuk status user. */
export function persenProdukUntuk(p: ProdukHarga, status: string): number {
  return clampPersen(status === 'aktif' ? p.diskon_langganan_persen : p.diskon_trial_persen);
}
/** Harga produk aktual (setelah diskon) untuk status user. */
export function hargaProdukUntuk(p: ProdukHarga, status: string): number {
  const persen = persenProdukUntuk(p, status);
  return persen > 0 ? Math.round((p.harga * (100 - persen)) / 100) : p.harga;
}

/** Persen diskon event (hanya untuk aktif). */
export function persenEventUntuk(ev: EventHarga, status: string): number {
  return status === 'aktif' ? clampPersen(ev.diskon_langganan_persen) : 0;
}
export function hargaEventUntuk(ev: EventHarga, status: string): number {
  const persen = persenEventUntuk(ev, status);
  return persen > 0 ? Math.round((ev.harga_per_anak * (100 - persen)) / 100) : ev.harga_per_anak;
}

// untuk tampilan
export const persenTrial = (p: ProdukHarga) => clampPersen(p.diskon_trial_persen);
export const persenLangganan = (p: ProdukHarga) => clampPersen(p.diskon_langganan_persen);
