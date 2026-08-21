// src/lib/domain/konsultasi-biaya.ts — biaya satu sesi konsultasi (murni, teruji).
//
// KEMBARAN dari perhitungan di dalam RPC `daftar_konsultasi` (0092/0096). Yang MENGIKAT
// tetap SQL — klien tak pernah mengirim nominal, hanya id voucher — tapi orang tua harus
// bisa melihat angkanya SEBELUM menekan Daftar, dan kode voucher hanya masuk akal kalau
// potongannya kelihatan. Bila salah satu sisi diubah, keduanya harus diubah bersama.
//
// Urutan yang ditiru dari RPC:
//   kuota gratis paket masih ada  → total 0, voucher tak dipakai sama sekali
//   selain itu                    → tarif → diskon member (%) → potongan voucher → total

export interface InputBiaya {
  /** tarif dasar psikolog (0 = pemilik belum mengisi tarif) */
  tarif: number;
  /** diskon member dalam persen; hanya berlaku bila `member` true */
  diskonPersen: number;
  /** anak ini punya langganan yang periodenya masih berjalan */
  member: boolean;
  /** sisa kuota konsultasi gratis dari paket anak (0 = habis / tak punya) */
  sisaKuota: number;
  /** potongan voucher yang sudah dinilai server (rupiah) */
  potonganVoucher?: number;
}

export interface HasilBiaya {
  dariKuota: boolean;
  /** harga sesudah diskon member, sebelum voucher */
  subtotal: number;
  potongan: number;
  total: number;
  diskonDipakai: number;
}

const bulat = (n: number) => Math.max(0, Math.round(n));

export function hitungBiayaKonsultasi(i: InputBiaya): HasilBiaya {
  // Kuota gratis dipakai lebih dulu — persis seperti RPC. Voucher TIDAK ikut terpakai,
  // supaya orang tua tak kehilangan vouchernya untuk sesi yang memang sudah gratis.
  if (i.sisaKuota > 0 && i.member) {
    return { dariKuota: true, subtotal: 0, potongan: 0, total: 0, diskonDipakai: 0 };
  }
  const diskon = i.member ? Math.min(100, Math.max(0, Math.floor(i.diskonPersen || 0))) : 0;
  const subtotal = bulat((Math.max(0, i.tarif) * (100 - diskon)) / 100);
  // Voucher tak berlaku pada sesi bernilai 0 (mis. diskon member 100%).
  const potongan = subtotal > 0 ? Math.min(bulat(i.potonganVoucher ?? 0), subtotal) : 0;
  return { dariKuota: false, subtotal, potongan, total: Math.max(0, subtotal - potongan), diskonDipakai: diskon };
}
