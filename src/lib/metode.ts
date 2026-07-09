// src/lib/metode.ts — daftar metode pembayaran (dipakai server & client)
export const METODE_BAYAR: { v: string; l: string }[] = [
  { v: 'cash', l: 'Cash' },
  { v: 'transfer', l: 'Transfer (TF)' },
  { v: 'qris', l: 'QRIS' },
  { v: 'cc', l: 'Kartu Kredit (CC)' },
];
export const labelMetode = (v: string) => METODE_BAYAR.find((m) => m.v === v)?.l ?? v;
