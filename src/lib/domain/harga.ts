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

// ——— Diskon per PAKET (migrasi 0089) ———
//
// Sumber persen: peta `diskon_paket` pada item ({kode paket: persen}). Bila paket tidak ada di
// peta — termasuk saat kolomnya belum ada karena migrasi belum dijalankan — dipakai kolom lama
// `diskon_langganan_persen`, sehingga data yang sekarang tetap berlaku. Bukan pelanggan = 0.
//
// Catatan: nilai 0 yang MEMANG ditulis admin di peta berarti "paket ini sengaja tanpa diskon"
// dan tidak boleh jatuh ke kolom lama — karena itu keberadaan kunci diperiksa, bukan
// kebenaran nilainya.
type ItemDiskon = { diskon_paket?: Record<string, number> | null; diskon_langganan_persen?: number | null };

export function persenUntukPaket(item: ItemDiskon, paketKode: string | null): number {
  if (!paketKode) return 0;
  const peta = item.diskon_paket ?? null;
  const ada = !!peta && Object.prototype.hasOwnProperty.call(peta, paketKode);
  return clampPersen(ada ? peta![paketKode] : item.diskon_langganan_persen);
}

export function hargaEventUntukPaket(ev: { harga_per_anak: number } & ItemDiskon, paketKode: string | null): number {
  const persen = persenUntukPaket(ev, paketKode);
  return persen > 0 ? Math.round((ev.harga_per_anak * (100 - persen)) / 100) : ev.harga_per_anak;
}

export function hargaProdukUntukPaket(p: { harga: number } & ItemDiskon, paketKode: string | null): number {
  const persen = persenUntukPaket(p, paketKode);
  return persen > 0 ? Math.round((p.harga * (100 - persen)) / 100) : p.harga;
}
