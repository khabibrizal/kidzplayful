// src/lib/data/kurikulum.ts — bulan kurikulum seorang anak + hasil evaluasinya.
//
// Kohort MILIK ANAK, bukan akun (0098): kakak di bulan ke-3 tidak membuka tema itu untuk
// bayi yang masih bulan ke-1. Karena itu tak ada fungsi "bulan kurikulum akun" di sini —
// yang ada hanya per anak, supaya tak ada jalan pintas yang menggabungkan kohort.
import { createClient } from '@/lib/supabase/server';
import { bulanKurikulumAnak } from '@/lib/domain/kurikulum';
import { konteksKurikulum, type KonteksKurikulum, type BracketUsia } from '@/lib/domain/siklus-kurikulum';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
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

/**
 * Konteks kurikulum SEORANG ANAK: siklus berjalan, kategori usia yang dibekukan untuk
 * siklus itu, dan bulan ke-berapa ia berada di dalam kategori tersebut.
 *
 * Semuanya DITURUNKAN dari tiga hal tersimpan — tanggal lahir anak, `kurikulum_mulai`
 * (0104), dan `bulan_kurikulum` (jumlah bulan yang sudah dibayar) — plus master kategori
 * usia. Tak ada penghitung yang perlu dinaikkan berkala, jadi tak ada cron yang bisa gagal
 * diam-diam dan tak ada penulisan saat halaman dirender.
 *
 * Semua pembacaan TOLERAN. Kolom `kurikulum_mulai` (0104) dan `bulan_kurikulum` (0098)
 * dibaca dengan cadangan, dan bila keduanya tak ada, `siklusBerjalan` memakai perilaku lama
 * (siklus = bulan dibayar) — kurikulum yang gagal dibaca tak boleh MENGUNCI tema yang
 * tadinya sudah terbuka.
 */
export async function getKonteksKurikulumAnak(anakId: string): Promise<KonteksKurikulum> {
  const s = await createClient();
  const hariIni = tanggalWIB();

  const [anakQ, katQ] = await Promise.all([
    s.from('anak').select('tanggal_lahir').eq('id', anakId).maybeSingle(),
    s.from('kategori_usia').select('id,usia_min,usia_max'),
  ]);
  const lahir = (anakQ.data?.tanggal_lahir as string | null) ?? null;
  const kategori = ((katQ.data ?? []) as unknown as BracketUsia[]);

  // `kurikulum_mulai` belum ada bila 0104 belum dijalankan → ulangi tanpa kolom itu.
  let mulai: string | null = null;
  let bulanDibayar = 0;
  const baru = await s.from('langganan_anak')
    .select('bulan_kurikulum,kurikulum_mulai').eq('anak_id', anakId).maybeSingle();
  if (!baru.error) {
    mulai = (baru.data?.kurikulum_mulai as string | null) ?? null;
    bulanDibayar = Math.max(0, Math.floor(Number(baru.data?.bulan_kurikulum) || 0));
  } else {
    const lama = await s.from('langganan_anak')
      .select('bulan_kurikulum').eq('anak_id', anakId).maybeSingle();
    bulanDibayar = lama.error ? 0 : Math.max(0, Math.floor(Number(lama.data?.bulan_kurikulum) || 0));
  }

  return konteksKurikulum({ lahir, mulai, hariIni, bulanDibayar, kategori });
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
