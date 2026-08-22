// src/lib/data/catatan-tema.ts — catatan perkembangan per TEMA (admin/guru/psikolog).
//
// Terpisah dari `evaluasi_kurikulum` (checklist orang tua) karena berbeda penulis dan
// berbeda bobot sebagai bukti — lihat 0099.
import { createClient } from '@/lib/supabase/server';

export interface NilaiTema { area: string; indikator: string; nilai: string }

export interface CatatanTema {
  id: string;
  anak_id: string;
  kelas_id: string;
  penulis_id: string;
  peran: 'admin' | 'guru' | 'psikolog';
  penilaian: NilaiTema[];
  catatan: string;
  updated_at: string;
  penulis_nama: string | null;
}

const COLS = 'id,anak_id,kelas_id,penulis_id,peran,penilaian,catatan,updated_at,penulis:penulis_id(nama_tampilan,email)';

function petakan(rows: unknown[]): CatatanTema[] {
  return (rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const p = Array.isArray(r.penulis) ? r.penulis[0] : r.penulis;
    const nm = p as { nama_tampilan?: string | null; email?: string | null } | null;
    return {
      id: r.id as string,
      anak_id: r.anak_id as string,
      kelas_id: r.kelas_id as string,
      penulis_id: r.penulis_id as string,
      peran: r.peran as CatatanTema['peran'],
      penilaian: (r.penilaian as NilaiTema[]) ?? [],
      catatan: (r.catatan as string) ?? '',
      updated_at: r.updated_at as string,
      penulis_nama: nm?.nama_tampilan?.trim() || nm?.email || null,
    };
  });
}

/** Semua catatan tema milik satu anak (terbaru dulu) — untuk rapor & halaman penulis. */
export async function getCatatanTemaAnak(anakId: string): Promise<CatatanTema[]> {
  const s = await createClient();
  const { data, error } = await s.from('catatan_tema').select(COLS)
    .eq('anak_id', anakId).order('updated_at', { ascending: false });
  if (error) return [];   // tabel belum ada (0099 belum dijalankan)
  return petakan(data ?? []);
}

/**
 * Catatan pada satu tema untuk satu anak, MILIK PENULIS yang sedang login.
 *
 * Sengaja tidak mengembalikan catatan penulis lain: form hanya boleh mengisi ulang
 * tulisannya sendiri (kunci unik 0099 = anak+kelas+penulis). Menampilkan catatan orang
 * lain di kotak edit akan membuat guru mengira sedang menyunting miliknya.
 */
export async function getCatatanTemaSaya(anakId: string, kelasId: string): Promise<CatatanTema | null> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from('catatan_tema').select(COLS)
    .eq('anak_id', anakId).eq('kelas_id', kelasId).eq('penulis_id', user.id).maybeSingle();
  if (error || !data) return null;
  return petakan([data])[0] ?? null;
}

export type PeranPenulis = 'admin' | 'guru' | 'psikolog';

/**
 * Daftar anak yang boleh ditulisi catatan oleh penulis yang login — dibangun BERBEDA per
 * peran, karena hak bacanya memang berbeda:
 *
 *   admin    → tabel `anak` (policy 0006).
 *   psikolog → dari `pendaftaran_konsultasi` miliknya yang diterima/selesai. Cakupan ini
 *              sama dengan `boleh_lihat_laporan_anak` (0066), jadi daftarnya tak pernah
 *              memuat anak yang nanti ditolak RLS saat menyimpan.
 *   guru     → dari snapshot `pendaftaran_event` (anak_ids + anak_nama). Guru TIDAK punya
 *              policy select pada tabel `anak`; inilah cara area Guru yang sudah ada
 *              mengenal peserta, dan meniru itu lebih baik daripada melebarkan akses
 *              tabel `anak` hanya demi satu halaman.
 */
export async function getAnakUntukPenulis(peran: PeranPenulis): Promise<{ id: string; nama: string }[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];

  if (peran === 'admin') {
    const { data } = await s.from('anak').select('id,nama').order('nama');
    return (data ?? []).map((r) => ({ id: r.id as string, nama: (r.nama as string) ?? 'Anak' }));
  }

  if (peran === 'psikolog') {
    const { data } = await s.from('pendaftaran_konsultasi')
      .select('anak_id,anak_nama,status').eq('psikolog_id', user.id).in('status', ['diterima', 'selesai']);
    const map = new Map<string, string>();
    for (const r of data ?? []) {
      if (r.anak_id) map.set(r.anak_id as string, (r.anak_nama as string) ?? 'Anak');
    }
    return [...map.entries()].map(([id, nama]) => ({ id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
  }

  // guru
  const { data } = await s.from('pendaftaran_event').select('anak_ids,anak_nama,status').eq('status', 'diterima');
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    const ids = (r.anak_ids ?? []) as string[];
    const nama = (r.anak_nama ?? []) as string[];
    ids.forEach((id, i) => { if (id) map.set(id, nama[i] ?? 'Anak'); });
  }
  return [...map.entries()].map(([id, nama]) => ({ id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
}
