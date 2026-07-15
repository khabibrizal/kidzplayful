// src/lib/data/guru-actions.ts — simpan Catatan Perkembangan (educator & admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { BarisNilai } from '@/lib/game/tipe';

// Guru ATAU admin boleh mengisi nilai perkembangan.
async function pengisi() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_guru,is_admin,is_psikolog,nama_tampilan').eq('id', user.id).single();
  if (!prof?.is_guru && !prof?.is_admin && !prof?.is_psikolog) throw new Error('Tidak berwenang.');
  // Izin fitur "nilai" per role (admin dikontrol via kolom Admin di Akses Fitur; default: semua)
  {
    const { getFiturAkses } = await import('./pengaturan-menu');
    const { fiturUntukRole } = await import('@/lib/menu-admin');
    const boleh = fiturUntukRole(await getFiturAkses(), { is_admin: prof.is_admin, is_guru: prof.is_guru, is_psikolog: prof.is_psikolog });
    if (!boleh.has('nilai')) throw new Error('Fitur "Memberi Nilai" tidak diaktifkan untuk Anda.');
  }
  return { s, nama: (prof.nama_tampilan as string) || (prof.is_guru ? 'Guru' : prof.is_psikolog ? 'Psikolog' : 'Admin') };
}

export async function simpanCatatan(input: {
  eventId: string; anakId: string; ortuId: string;
  penilaian: BarisNilai[]; catatan: string;
}): Promise<void> {
  const { s, nama } = await pengisi();
  const penilaian = (input.penilaian ?? []).map((r) => ({ area: r.area, indikator: r.indikator, nilai: r.nilai }));
  const { error } = await s.from('catatan_perkembangan').upsert({
    event_id: input.eventId,
    anak_id: input.anakId,
    ortu_id: input.ortuId,
    penilaian,
    catatan: input.catatan.trim() || null,
    dinilai_oleh: nama,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,anak_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/guru/${input.eventId}`);
  revalidatePath(`/admin/event/${input.eventId}/pendaftar`);
}
