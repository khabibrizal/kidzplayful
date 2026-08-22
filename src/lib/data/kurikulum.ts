// src/lib/data/kurikulum.ts — bulan kurikulum seorang anak + hasil evaluasinya.
//
// Kohort MILIK ANAK, bukan akun (0098): kakak di bulan ke-3 tidak membuka tema itu untuk
// bayi yang masih bulan ke-1. Karena itu tak ada fungsi "bulan kurikulum akun" di sini —
// yang ada hanya per anak, supaya tak ada jalan pintas yang menggabungkan kohort.
import { createClient } from '@/lib/supabase/server';
import { bulanKurikulumAnak } from '@/lib/domain/kurikulum';
import type { EvaluasiKurikulum } from '@/lib/game/tipe';

/**
 * Bulan kurikulum SEORANG ANAK.
 * Kolom/tabel belum ada (0098 belum dijalankan) → bulan ke-1, bukan galat: kurikulum yang
 * gagal dibaca harus membuka bulan pertama, bukan mengunci semuanya.
 */
export async function getBulanKurikulumAnak(anakId: string): Promise<number> {
  const s = await createClient();
  const { data, error } = await s.from('langganan_anak')
    .select('bulan_kurikulum').eq('anak_id', anakId).maybeSingle();
  if (error) return bulanKurikulumAnak(0);
  return bulanKurikulumAnak((data?.bulan_kurikulum as number | null) ?? 0);
}

/** Bulan kurikulum untuk BANYAK anak sekaligus (peta anakId → bulan). */
export async function getBulanKurikulumBanyak(anakIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (anakIds.length === 0) return out;
  const s = await createClient();
  const { data, error } = await s.from('langganan_anak')
    .select('anak_id,bulan_kurikulum').in('anak_id', anakIds);
  for (const id of anakIds) out[id] = bulanKurikulumAnak(0);
  if (error) return out;
  for (const r of data ?? []) {
    out[r.anak_id as string] = bulanKurikulumAnak((r.bulan_kurikulum as number | null) ?? 0);
  }
  return out;
}

/** Semua evaluasi tersimpan milik satu anak — untuk rapor & mengisi ulang checklist. */
export async function getEvaluasiAnak(anakId: string): Promise<EvaluasiKurikulum[]> {
  const s = await createClient();
  const { data, error } = await s.from('evaluasi_kurikulum')
    .select('kelas_id,hasil,catatan,dinilai_oleh,peran,updated_at')
    .eq('anak_id', anakId).order('updated_at', { ascending: false });
  if (error) return [];   // tabel belum ada (0098 belum dijalankan)
  return (data ?? []) as unknown as EvaluasiKurikulum[];
}

/**
 * Evaluasi satu anak pada satu tema, untuk PERAN tertentu (bawaan: 'ortu').
 *
 * Perannya ikut disaring karena satu tema bisa punya checklist orang tua DAN checklist
 * guru berdampingan (kunci unik 0098 = anak+kelas+peran). Mengembalikan yang pertama
 * ditemukan saja akan menampilkan penilaian orang lain sebagai milik sendiri.
 */
export async function getEvaluasiTema(
  anakId: string, kelasId: string, peran: EvaluasiKurikulum['peran'] = 'ortu',
): Promise<EvaluasiKurikulum | null> {
  const s = await createClient();
  const { data, error } = await s.from('evaluasi_kurikulum')
    .select('kelas_id,hasil,catatan,dinilai_oleh,peran,updated_at')
    .eq('anak_id', anakId).eq('kelas_id', kelasId).eq('peran', peran).maybeSingle();
  if (error) return null;
  return (data as unknown as EvaluasiKurikulum) ?? null;
}
