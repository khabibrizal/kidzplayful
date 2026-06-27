// src/lib/data/admin-event-actions.ts — CRUD event + ubah status pendaftaran (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { EventKelas } from '@/lib/game/tipe';

export interface EventInput {
  judul: string;
  lokasi: string;
  tanggal: string;     // 'YYYY-MM-DD' atau ''
  jamMulai: string;
  jamSelesai: string;
  deskripsi: string;
  gambarUrl: string | null;
  hargaPerAnak: number;
}
const COLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
function row(i: EventInput) {
  return {
    judul: i.judul.trim() || 'Tanpa judul',
    lokasi: i.lokasi.trim() || null,
    tanggal: i.tanggal || null,
    jam_mulai: i.jamMulai.trim() || null,
    jam_selesai: i.jamSelesai.trim() || null,
    deskripsi: i.deskripsi.trim() || null,
    gambar_url: i.gambarUrl?.trim() || null,
    harga_per_anak: Math.max(0, Math.floor(Number(i.hargaPerAnak) || 0)),
  };
}

export async function buatEvent(i: EventInput): Promise<EventKelas> {
  const s = await adminDb();
  if (!i.judul.trim()) throw new Error('Judul wajib diisi.');
  const { data, error } = await s.from('event').insert(row(i)).select(COLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
  return data as unknown as EventKelas;
}
export async function updateEvent(id: string, i: EventInput): Promise<EventKelas> {
  const s = await adminDb();
  const { data, error } = await s.from('event').update(row(i)).eq('id', id).select(COLS).single();
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
  return data as unknown as EventKelas;
}
export async function toggleStatusEvent(id: string, statusBaru: 'tampil' | 'arsip'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('event').update({ status: statusBaru }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
}
export async function hapusEvent(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('event').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath('/event');
}

export async function setStatusPendaftaran(id: string, statusBaru: 'menunggu' | 'diterima' | 'ditolak'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('pendaftaran_event').update({ status: statusBaru }).eq('id', id);
  if (error) throw new Error(error.message);
}
