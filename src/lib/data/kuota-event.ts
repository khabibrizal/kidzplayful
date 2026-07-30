// src/lib/data/kuota-event.ts — akses kolom kuota event secara TOLERAN.
// Kolom `event.kuota_*` (migrasi 0086) mungkin belum ada di database. Bila belum,
// seluruh fitur lain (daftar event, pendaftaran, simpan event) harus tetap jalan —
// kuota cukup dianggap "tanpa batas" sampai migrasinya dijalankan.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface KuotaEvent { baby: number | null; toddler: number | null; gabungan: number | null }
export const KUOTA_KOSONG: KuotaEvent = { baby: null, toddler: null, gabungan: null };
export const KUOTA_COLS = 'kuota_baby,kuota_toddler,kuota_gabungan';

/** true bila error berasal dari kolom kuota yang belum ada (migrasi 0086 belum jalan). */
export function kolomKuotaHilang(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42703' || /kuota_(baby|toddler|gabungan)/.test(err.message ?? '');
}

const angkaAtauNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

/** Baca kuota sebuah event. Gagal / kolom belum ada → semua null (tanpa batas). */
export async function bacaKuotaEvent(s: SupabaseClient, eventId: string): Promise<KuotaEvent> {
  const { data, error } = await s.from('event').select(KUOTA_COLS).eq('id', eventId).maybeSingle();
  if (error || !data) {
    if (error && !kolomKuotaHilang(error)) console.error('bacaKuotaEvent:', error.message);
    return { ...KUOTA_KOSONG };
  }
  const d = data as Record<string, unknown>;
  return { baby: angkaAtauNull(d.kuota_baby), toddler: angkaAtauNull(d.kuota_toddler), gabungan: angkaAtauNull(d.kuota_gabungan) };
}

/** Ambil nilai kuota untuk sebuah kelas. */
export function kuotaUntukKelas(k: KuotaEvent, kelas: string): number | null {
  return kelas === 'baby' ? k.baby : kelas === 'toddler' ? k.toddler : k.gabungan;
}
