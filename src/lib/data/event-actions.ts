// src/lib/data/event-actions.ts — pendaftaran event oleh ortu
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function daftarEvent(eventId: string, anakIds: string[], buktiUrl: string | null): Promise<void> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  if (!anakIds.length) throw new Error('Pilih minimal 1 anak.');

  const { data: ev } = await s.from('event').select('harga_per_anak,status').eq('id', eventId).maybeSingle();
  if (!ev || ev.status !== 'tampil') throw new Error('Event tidak tersedia.');

  // hanya anak milik ortu yang valid
  const { data: anak } = await s.from('anak').select('id,nama').in('id', anakIds).eq('ortu_id', user.id);
  const valid = anak ?? [];
  if (!valid.length) throw new Error('Anak tidak valid.');

  const total = (ev.harga_per_anak ?? 0) * valid.length;
  const { error } = await s.from('pendaftaran_event').insert({
    event_id: eventId,
    ortu_id: user.id,
    anak_ids: valid.map((a) => a.id),
    anak_nama: valid.map((a) => a.nama),
    jumlah_anak: valid.length,
    total,
    bukti_url: buktiUrl,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/event');
  revalidatePath('/pilih-anak');
}
