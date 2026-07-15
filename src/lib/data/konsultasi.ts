// src/lib/data/konsultasi.ts — data konsultasi (sisi customer + reader bersama chat/rekomendasi)
import { createClient } from '@/lib/supabase/server';
import type { JadwalPsikolog, PendaftaranKonsultasi, PesanKonsultasi, RekomendasiPsikolog } from '@/lib/game/tipe';

const PCOLS = 'id,ortu_id,psikolog_id,anak_id,anak_nama,tanggal,keluhan,status,diverifikasi_pada,created_at';

/** Daftar psikolog yang membuka jadwal (aktif). Nama dari denormalisasi jadwal. */
export async function getPsikologTersedia(): Promise<JadwalPsikolog[]> {
  const s = await createClient();
  const { data } = await s.from('jadwal_psikolog')
    .select('psikolog_id,nama,hari_buka,jam_mulai,jam_selesai,maks_per_hari,aktif,catatan')
    .eq('aktif', true).order('nama');
  return (data ?? []) as unknown as JadwalPsikolog[];
}

/** Anak milik ortu yang login (untuk form booking). */
export async function getAnakSaya(): Promise<{ id: string; nama: string }[]> {
  const s = await createClient();
  const { data } = await s.from('anak').select('id,nama').order('created_at');
  return (data ?? []) as { id: string; nama: string }[];
}

/** Booking/sesi konsultasi milik ortu yang login. */
export async function getKonsultasiSaya(): Promise<PendaftaranKonsultasi[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('pendaftaran_konsultasi').select(PCOLS)
    .eq('ortu_id', user.id).order('created_at', { ascending: false });
  return (data ?? []) as unknown as PendaftaranKonsultasi[];
}

/** Pesan pada satu sesi (urut lama→baru). RLS membatasi ke peserta. */
export async function getPesan(pendaftaranId: string): Promise<PesanKonsultasi[]> {
  const s = await createClient();
  const { data } = await s.from('pesan_konsultasi')
    .select('id,pendaftaran_id,pengirim_id,nama,teks,dibaca_at,created_at')
    .eq('pendaftaran_id', pendaftaranId).order('created_at', { ascending: true });
  return (data ?? []) as unknown as PesanKonsultasi[];
}

/** Riwayat rekomendasi untuk satu anak (baru→lama). */
export async function getRekomendasiAnak(anakId: string): Promise<RekomendasiPsikolog[]> {
  const s = await createClient();
  const { data } = await s.from('rekomendasi_psikolog')
    .select('id,anak_id,ortu_id,psikolog_id,pendaftaran_id,judul,isi,butir,dinilai_oleh,created_at')
    .eq('anak_id', anakId).order('created_at', { ascending: false });
  return (data ?? []) as unknown as RekomendasiPsikolog[];
}
