// src/lib/data/kegiatan-actions.ts — catat kegiatan mandiri anak.
//
// Dipanggil dari Mode Anak / Mode Ortu saat anak membuka materi Ide Bermain atau memutar
// video. Judulnya di-SNAPSHOT supaya rapor tetap terbaca bila materinya diubah/dihapus.
'use server';
import { createClient } from '@/lib/supabase/server';

export async function catatKegiatan(
  anakId: string, jenis: 'ide-bermain' | 'video', refId: string | null, judul: string | null,
): Promise<void> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user || !anakId) return;
    // Anak wajib milik ortu yang login — RLS juga menegakkannya, ini sekadar berhenti awal.
    const { data: anak } = await s.from('anak').select('id').eq('id', anakId).eq('ortu_id', user.id).maybeSingle();
    if (!anak) return;
    await s.from('kegiatan_anak').insert({
      anak_id: anakId, ortu_id: user.id, jenis,
      ref_id: refId, judul: (judul ?? '').trim() || null,
    });
  } catch {
    // Pencatatan rapor TIDAK boleh menggagalkan aktivitas anak: kalau tabelnya belum ada
    // (migrasi 0093 belum jalan) atau insertnya gagal, biarkan diam.
  }
}
