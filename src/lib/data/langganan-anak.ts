// src/lib/data/langganan-anak.ts — hak akses PER ANAK (dan turunannya per akun).
//
// Ini pengganti `getStatusLangganan()` untuk keputusan AKSES. Berkas `langganan-status.ts`
// tetap ada karena masih dipakai halaman admin/investor untuk menampilkan status akun.
import { createClient } from '@/lib/supabase/server';
import { getPaketMap } from './paket';
import { getPengaturanTrial } from './pengaturan-trial';
import { TENGGANG_HARI } from '@/lib/domain/trial';
import {
  hakAksesAnak, hakAksesAkun, HAK_KOSONG,
  type HakAksesAnak, type HakAksesAkun, type KonfigTrial,
} from '@/lib/domain/entitlement';
import type { BarisLanggananAnak } from '@/lib/game/tipe';

const COLS = 'anak_id,paket_id,paket_berikutnya_id,aktif_sampai';

/** Hak "tanpa apa pun" — dipakai saat belum login. */
export const HAK_ANAK_KOSONG: HakAksesAnak = { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
export const HAK_AKUN_KOSONG: HakAksesAkun = { paketTertinggi: null, diskonKode: null, komunitas: false };

/**
 * Baris langganan semua anak milik satu ortu.
 * Tabel belum ada (migrasi 0089 belum jalan) → peta kosong, sehingga semua anak jatuh ke
 * jalur trial dan aplikasi tetap berjalan.
 */
export async function barisLanggananAnak(ortuId: string): Promise<Map<string, BarisLanggananAnak>> {
  const s = await createClient();
  const { data, error } = await s.from('langganan_anak').select(COLS).eq('ortu_id', ortuId);
  if (error) return new Map();
  return new Map((data ?? []).map((r) => [r.anak_id as string, r as unknown as BarisLanggananAnak]));
}

async function konfigTrial(ortuId: string): Promise<KonfigTrial> {
  const s = await createClient();
  const [{ data: lang }, cfg] = await Promise.all([
    s.from('langganan').select('trial_mulai').eq('ortu_id', ortuId).maybeSingle(),
    getPengaturanTrial(),
  ]);
  return {
    trialMulai: (lang?.trial_mulai as string | null) ?? null,
    trialHari: cfg.trial_hari,
    tenggangHari: TENGGANG_HARI,
    trialPaketId: cfg.trial_paket_id,
  };
}

/** Hak akses satu anak — dipakai /main, /ortu, /pilih-game. */
export async function getHakAnak(anakId: string): Promise<HakAksesAnak> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return HAK_ANAK_KOSONG;
  const [baris, trial, paketMap] = await Promise.all([
    barisLanggananAnak(user.id), konfigTrial(user.id), getPaketMap(),
  ]);
  return hakAksesAnak(baris.get(anakId) ?? null, paketMap, trial, new Date());
}

/**
 * Hak tingkat akun — diskon event & produk, Komunitas, detail materi.
 * Memakai paket TERTINGGI di antara anak yang aktif (lihat `hakAksesAkun`).
 */
export async function getHakAkun(): Promise<HakAksesAkun> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return HAK_AKUN_KOSONG;
  const { data: anak } = await s.from('anak').select('id').eq('ortu_id', user.id);
  const [baris, trial, paketMap] = await Promise.all([
    barisLanggananAnak(user.id), konfigTrial(user.id), getPaketMap(),
  ]);
  const kini = new Date();
  const hak = (anak ?? []).map((a) => hakAksesAnak(baris.get(a.id as string) ?? null, paketMap, trial, kini));
  return hakAksesAkun(hak);
}
