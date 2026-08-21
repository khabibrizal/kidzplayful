// src/lib/domain/langganan-harga.ts — hitungan tagihan langganan (murni, tanpa I/O).
//
// Urutan hitungnya SAMA dengan pendaftaran event: harga per item → diskon (keluarga) →
// potongan voucher. Voucher dihitung dari nilai SETELAH diskon keluarga, bukan dari subtotal.
//
// Diskon keluarga pada tagihan berpaket CAMPUR memakai aturan dari **paket tertinggi** di
// tagihan itu. Alternatifnya (menghitung per kelompok paket) lebih "adil" secara matematis
// tapi sulit dijelaskan ke orang tua dan sulit diverifikasi admin secara manual — dan
// aturan yang dipakai selalu ditampilkan di layar, tidak disembunyikan.
import type { PaketLangganan, AturanKeluarga } from '@/lib/game/tipe';

export interface ItemTagihan { anakId: string; paket: PaketLangganan }

export interface VoucherTagihan { tipe: 'nominal' | 'persen'; nilai: number }

export interface HasilTagihan {
  subtotal: number;
  diskonKeluarga: number;
  potonganVoucher: number;
  total: number;
  /** Aturan keluarga yang benar-benar dipakai (untuk ditampilkan ke orang tua). */
  aturanDipakai: AturanKeluarga | null;
  /** Paket tertinggi di tagihan — sumber aturan keluarga. */
  paketAcuan: PaketLangganan | null;
}

const bulat = (n: number) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
const persenAman = (p: number) => Math.min(100, Math.max(0, Math.floor(Number(p) || 0)));

/** Aturan dengan `min_anak` TERBESAR yang terpenuhi jumlah anak. */
export function aturanKeluargaTerpakai(aturan: AturanKeluarga[], jumlahAnak: number): AturanKeluarga | null {
  return (aturan ?? [])
    .filter((r) => jumlahAnak >= Math.max(2, Math.floor(Number(r.min_anak) || 0)))
    .sort((a, b) => a.min_anak - b.min_anak)
    .pop() ?? null;
}

export function hitungTagihan(input: {
  item: ItemTagihan[];
  bulan?: number;
  voucher?: VoucherTagihan | null;
}): HasilTagihan {
  const bulan = Math.max(1, Math.floor(input.bulan ?? 1));
  const item = input.item ?? [];
  const subtotal = bulat(item.reduce((a, it) => a + (it.paket?.harga_bulanan ?? 0), 0) * bulan);

  // Paket acuan = urutan terbesar di tagihan ini.
  const paketAcuan = item.reduce<PaketLangganan | null>(
    (t, it) => (it.paket && (!t || it.paket.urutan > t.urutan) ? it.paket : t), null);

  const aturan = paketAcuan ? aturanKeluargaTerpakai(paketAcuan.diskon_keluarga ?? [], item.length) : null;
  let diskonKeluarga = 0;
  if (aturan) {
    diskonKeluarga = (aturan.persen ?? 0) > 0
      ? bulat((subtotal * persenAman(aturan.persen ?? 0)) / 100)
      : bulat(aturan.nominal ?? 0);
    diskonKeluarga = Math.min(diskonKeluarga, subtotal);   // tak boleh melebihi subtotal
  }

  const setelahKeluarga = Math.max(0, subtotal - diskonKeluarga);

  let potonganVoucher = 0;
  if (input.voucher && setelahKeluarga > 0) {
    potonganVoucher = input.voucher.tipe === 'persen'
      ? bulat((setelahKeluarga * persenAman(input.voucher.nilai)) / 100)
      : bulat(input.voucher.nilai);
    potonganVoucher = Math.min(potonganVoucher, setelahKeluarga);   // total tak boleh minus
  }

  return {
    subtotal,
    diskonKeluarga,
    potonganVoucher,
    total: Math.max(0, setelahKeluarga - potonganVoucher),
    aturanDipakai: aturan,
    paketAcuan,
  };
}
