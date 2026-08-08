// src/lib/data/sertifikat.ts — baca e-sertifikat (sisi orang tua / view)
import { createClient } from '@/lib/supabase/server';
import type { Sertifikat } from '@/lib/game/tipe';

const COLS = 'id,event_id,anak_id,ortu_id,anak_nama,event_judul,event_tanggal,lokasi,bg_url,dokumentasi_url,diterbitkan_oleh,created_at';

/** Semua sertifikat milik satu anak (RLS membatasi ke sertifikat milik ortu login). */
export async function getSertifikatAnak(anakId: string): Promise<Sertifikat[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const [{ data }, { data: anak }] = await Promise.all([
    s.from('sertifikat').select(COLS).eq('anak_id', anakId).order('created_at', { ascending: false }),
    s.from('anak').select('nama').eq('id', anakId).maybeSingle(),
  ]);
  const lengkap = (anak?.nama as string | undefined)?.trim();
  const rows = (data ?? []) as unknown as Sertifikat[];
  // Nama lengkap terkini menggantikan snapshot (alasan sama seperti getSertifikat).
  return lengkap ? rows.map((r) => ({ ...r, anak_nama: lengkap })) : rows;
}

/**
 * Satu sertifikat berdasarkan id (RLS: hanya ortu pemilik / admin).
 *
 * `sertifikat.anak_nama` adalah SNAPSHOT nama saat sertifikat dibuat, yang berasal dari
 * snapshot pendaftaran. Bila orang tua melengkapi nama anak setelah mendaftar, snapshot
 * itu jadi basi (mis. cuma nama depan). Karena sertifikat harus memuat NAMA LENGKAP,
 * nama dibaca ulang dari tabel `anak` dan snapshot hanya dipakai sebagai cadangan
 * (mis. bila baris anak sudah dihapus). Berlaku juga untuk sertifikat LAMA — tanpa
 * perlu men-generate ulang.
 */
export async function getSertifikat(id: string): Promise<Sertifikat | null> {
  const s = await createClient();
  const { data } = await s.from('sertifikat').select(COLS).eq('id', id).maybeSingle();
  if (!data) return null;
  const sert = data as unknown as Sertifikat;
  if (sert.anak_id) {
    const { data: anak } = await s.from('anak').select('nama').eq('id', sert.anak_id).maybeSingle();
    const lengkap = (anak?.nama as string | undefined)?.trim();
    if (lengkap) sert.anak_nama = lengkap;
  }
  return sert;
}
