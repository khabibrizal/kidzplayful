// src/lib/data/psikolog.ts — data untuk area Psikolog
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { JadwalPsikolog, PendaftaranKonsultasi } from '@/lib/game/tipe';

const PCOLS = 'id,ortu_id,psikolog_id,anak_id,anak_nama,tanggal,keluhan,status,diverifikasi_pada,created_at';

/** Guard: pastikan user adalah psikolog. Mengembalikan profil psikolog. */
export async function getPsikologTerjamin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await s.from('profiles').select('nama_tampilan,is_psikolog').eq('id', user.id).single();
  if (!prof?.is_psikolog) redirect('/pilih-anak');
  return { id: user.id, nama: prof.nama_tampilan as string | null };
}

/** Pendaftaran menunggu persetujuan + sesi aktif (diterima). */
export async function getSesiPsikolog(psikologId: string): Promise<{ menunggu: PendaftaranKonsultasi[]; aktif: PendaftaranKonsultasi[] }> {
  const s = await createClient();
  const { data } = await s.from('pendaftaran_konsultasi').select(PCOLS)
    .eq('psikolog_id', psikologId)
    .in('status', ['menunggu', 'diterima'])
    .order('tanggal', { ascending: true });
  const rows = (data ?? []) as unknown as PendaftaranKonsultasi[];
  return {
    menunggu: rows.filter((r) => r.status === 'menunggu'),
    aktif: rows.filter((r) => r.status === 'diterima'),
  };
}

/** Jadwal & kuota milik psikolog yang login (null bila belum diatur). */
export async function getJadwalSaya(psikologId: string): Promise<JadwalPsikolog | null> {
  const s = await createClient();
  const { data } = await s.from('jadwal_psikolog')
    .select('psikolog_id,nama,hari_buka,jam_mulai,jam_selesai,maks_per_hari,aktif,catatan')
    .eq('psikolog_id', psikologId).maybeSingle();
  return (data as unknown as JadwalPsikolog) ?? null;
}

/** Satu pendaftaran (untuk halaman chat). RLS membatasi ke peserta/admin. */
export async function getPendaftaranById(id: string): Promise<PendaftaranKonsultasi | null> {
  const s = await createClient();
  const { data } = await s.from('pendaftaran_konsultasi').select(PCOLS).eq('id', id).maybeSingle();
  return (data as unknown as PendaftaranKonsultasi) ?? null;
}
