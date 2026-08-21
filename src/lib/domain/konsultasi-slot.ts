// src/lib/domain/konsultasi-slot.ts — kapan sebuah sesi konsultasi MEMAKAI slot psikolog.
//
// Aturan pemilik: **slot baru terpakai sesudah dibayar.** Sebelumnya booking apa pun
// langsung dihitung, sehingga siapa pun bisa menahan slot tanpa pernah membayar.
//
// PENEGAKNYA ADA DI SQL (`konsultasi_memakai_slot` + trigger `cek_slot_konsultasi`,
// migrasi 0096) — bukan di sini. Berkas ini kembarannya untuk **label & tampilan**,
// supaya layar tak mengarang keadaan yang berbeda dari yang ditegakkan database.
// Bila salah satu diubah, keduanya harus diubah bersama.

export interface SesiSlot {
  status: string;
  total: number | null;
  buktiUrl: string | null;
  batasBayar: string | null;
}

/** true bila sesi ini menempati kuota harian psikolog. */
export function memakaiSlotKonsultasi(s: Pick<SesiSlot, 'status' | 'total' | 'buktiUrl'>): boolean {
  if (s.status === 'diterima') return true;
  if (s.status === 'menunggu' || s.status === 'menunggu_bayar') {
    return (s.total ?? 0) === 0 || !!s.buktiUrl;
  }
  return false;
}

/** Draft yang belum dibayar dan batas waktunya sudah lewat — dianggap hangus. */
export function draftKedaluwarsa(s: SesiSlot, sekarang: Date): boolean {
  if (s.status !== 'menunggu_bayar' || s.buktiUrl) return false;
  if (!s.batasBayar) return false;
  return new Date(s.batasBayar).getTime() <= sekarang.getTime();
}

export type KeadaanSlot = 'aman' | 'draft' | 'hangus' | 'tak-relevan';

/**
 * Keadaan slot untuk ditampilkan ke orang tua & psikolog.
 *
 * `draft` sengaja dibedakan dari `aman`: inilah yang dulu tidak pernah dikatakan ke
 * siapa pun — orang tua mengira sudah terdaftar, padahal slotnya belum diamankan.
 */
export function keadaanSlot(s: SesiSlot, sekarang: Date): KeadaanSlot {
  if (draftKedaluwarsa(s, sekarang)) return 'hangus';
  if (memakaiSlotKonsultasi(s)) return 'aman';
  if (s.status === 'menunggu' || s.status === 'menunggu_bayar') return 'draft';
  return 'tak-relevan';
}
