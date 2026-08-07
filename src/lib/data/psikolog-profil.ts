// src/lib/data/psikolog-profil.ts — master profil psikolog (migrasi 0087).
//
// AKSES TOLERAN (aturan wajib di CLAUDE.md): tabel ini bisa BELUM ADA saat kode sudah
// ter-deploy, karena migrasi dijalankan manual. Semua pembacaan di sini menelan kegagalan
// dan mengembalikan peta kosong → halaman konsultasi tetap jalan dengan nama dari
// `jadwal_psikolog` seperti sebelumnya, hanya tanpa kartu profil.
import { createClient } from '@/lib/supabase/server';

export interface ProfilPsikolog {
  psikolog_id: string;
  nama: string;
  badge: string | null;
  spesialisasi: string | null;
  foto_url: string | null;
  pendidikan_s1: string | null;
  pendidikan_profesi: string | null;
  no_str: string | null;
  pengalaman: string | null;
  urutan: number;
  aktif: boolean;
}

export const PROFIL_COLS =
  'psikolog_id,nama,badge,spesialisasi,foto_url,pendidikan_s1,pendidikan_profesi,no_str,pengalaman,urutan,aktif';

/** true bila error berasal dari tabel/kolom yang belum ada (migrasi 0087 belum jalan). */
export function tabelProfilHilang(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === '42703' || /psikolog_profil/.test(err.message ?? '');
}

/** Peta psikolog_id → profil. Gagal / tabel belum ada → peta kosong. */
export async function getProfilPsikologMap(): Promise<Record<string, ProfilPsikolog>> {
  const s = await createClient();
  const { data, error } = await s.from('psikolog_profil').select(PROFIL_COLS).order('urutan');
  if (error) {
    if (!tabelProfilHilang(error)) console.error('getProfilPsikologMap:', error.message);
    return {};
  }
  const map: Record<string, ProfilPsikolog> = {};
  for (const r of (data ?? []) as unknown as ProfilPsikolog[]) map[r.psikolog_id] = r;
  return map;
}

/** Profil satu psikolog (dipakai halaman admin). */
export async function getProfilPsikolog(id: string): Promise<ProfilPsikolog | null> {
  const s = await createClient();
  const { data, error } = await s.from('psikolog_profil').select(PROFIL_COLS).eq('psikolog_id', id).maybeSingle();
  if (error) {
    if (!tabelProfilHilang(error)) console.error('getProfilPsikolog:', error.message);
    return null;
  }
  return (data as unknown as ProfilPsikolog) ?? null;
}
