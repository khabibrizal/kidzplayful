// src/lib/data/guru.ts — data untuk area Guru
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { EventKelas, CatatanPerkembangan } from '@/lib/game/tipe';

const ECOLS = 'id,judul,lokasi,tanggal,jam_mulai,jam_selesai,deskripsi,gambar_url,harga_per_anak,status';

/** Guard: pastikan user adalah guru. Mengembalikan profil guru. */
export async function getGuruTerjamin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await s.from('profiles').select('nama_tampilan,is_guru').eq('id', user.id).single();
  if (!prof?.is_guru) redirect('/pilih-anak');
  return { id: user.id, nama: prof.nama_tampilan as string | null };
}

export async function getEventUntukGuru(): Promise<EventKelas[]> {
  const s = await createClient();
  const { data } = await s.from('event').select(ECOLS).order('tanggal', { ascending: false });
  return (data ?? []) as unknown as EventKelas[];
}

export interface Peserta { anak_id: string; nama: string; ortu_id: string }

/** Peserta event (dari pendaftaran "diterima") + catatan yang sudah ada. */
export async function getPesertaEvent(eventId: string): Promise<{ event: EventKelas | null; peserta: Peserta[]; catatan: Record<string, CatatanPerkembangan> }> {
  const s = await createClient();
  const { data: ev } = await s.from('event').select(ECOLS).eq('id', eventId).maybeSingle();
  const { data: pd } = await s.from('pendaftaran_event').select('anak_ids,anak_nama,ortu_id,status').eq('event_id', eventId).eq('status', 'diterima');
  const peserta: Peserta[] = [];
  for (const r of pd ?? []) {
    const ids = (r.anak_ids ?? []) as string[];
    const nama = (r.anak_nama ?? []) as string[];
    ids.forEach((id, i) => peserta.push({ anak_id: id, nama: nama[i] ?? 'Anak', ortu_id: r.ortu_id as string }));
  }
  const { data: cat } = await s.from('catatan_perkembangan')
    .select('id,event_id,anak_id,ortu_id,aspek,catatan,dinilai_oleh,created_at').eq('event_id', eventId);
  const catatan: Record<string, CatatanPerkembangan> = {};
  for (const c of cat ?? []) catatan[c.anak_id as string] = c as unknown as CatatanPerkembangan;
  return { event: (ev as unknown as EventKelas) ?? null, peserta, catatan };
}
