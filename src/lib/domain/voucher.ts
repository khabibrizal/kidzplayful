// src/lib/domain/voucher.ts — logika voucher murni (tanpa DB), teruji.
export interface VoucherPotongan { tipe: 'nominal' | 'persen'; nilai: number }
export interface VoucherValidasi { aktif: boolean; berlaku_dari: string | null; berlaku_sampai: string | null; berlaku_event: boolean; berlaku_produk: boolean }

/** Potongan dari subtotal (di-clamp 0..subtotal). nominal=rupiah, persen=% (0-100). */
export function hitungPotongan(v: VoucherPotongan, subtotal: number): number {
  const sub = Math.max(0, Math.floor(subtotal || 0));
  if (v.tipe === 'nominal') return Math.min(Math.max(0, Math.floor(v.nilai || 0)), sub);
  const pct = Math.max(0, Math.min(100, Math.floor(v.nilai || 0)));
  return Math.min(Math.floor((sub * pct) / 100), sub);
}

/** Validasi non-kuota (kuota dicek di server karena butuh DB). Return pesan error atau null. */
export function validasiVoucher(v: VoucherValidasi, ctx: { jenis: 'event' | 'produk'; hariIni: string }): string | null {
  if (!v.aktif) return 'Voucher tidak aktif.';
  if (v.berlaku_dari && ctx.hariIni < v.berlaku_dari) return 'Voucher belum berlaku.';
  if (v.berlaku_sampai && ctx.hariIni > v.berlaku_sampai) return 'Voucher sudah kadaluarsa.';
  const cocok = ctx.jenis === 'event' ? v.berlaku_event : v.berlaku_produk;
  if (!cocok) return 'Voucher tidak berlaku untuk transaksi ini.';
  return null;
}
