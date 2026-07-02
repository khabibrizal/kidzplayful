// src/lib/data/admin-sertifikat-actions.ts — generate & hapus e-sertifikat (admin)
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,nama_tampilan,email').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  const olehNama = (prof.nama_tampilan as string | null)?.trim() || (prof.email as string | null) || null;
  return { s, olehNama };
}

/**
 * Generate e-sertifikat untuk SEMUA anak berstatus HADIR di sebuah event.
 * Idempoten (upsert on (event_id, anak_id)): aman dijalankan berulang —
 * mis. setelah menandai anak hadir tambahan atau mengubah template/link.
 * Return jumlah sertifikat yang diterbitkan.
 */
export async function generateSertifikatEvent(eventId: string): Promise<number> {
  const { s, olehNama } = await adminDb();

  const { data: ev, error: e1 } = await s
    .from('event')
    .select('id,judul,tanggal,lokasi,sertifikat_bg_url,dokumentasi_url')
    .eq('id', eventId)
    .single();
  if (e1) throw new Error(e1.message);

  const { data: pendaftaran, error: e2 } = await s
    .from('pendaftaran_event')
    .select('ortu_id,anak_ids,anak_nama,hadir_anak_ids,status')
    .eq('event_id', eventId)
    .eq('status', 'diterima');
  if (e2) throw new Error(e2.message);

  const rows: Record<string, unknown>[] = [];
  for (const p of pendaftaran ?? []) {
    const ids = (p.anak_ids as string[]) ?? [];
    const nama = (p.anak_nama as string[]) ?? [];
    const hadir = new Set<string>((p.hadir_anak_ids as string[]) ?? []);
    ids.forEach((anakId, i) => {
      if (!hadir.has(anakId)) return;
      rows.push({
        event_id: ev.id,
        anak_id: anakId,
        ortu_id: p.ortu_id,
        anak_nama: nama[i] ?? 'Anak',
        event_judul: ev.judul,
        event_tanggal: ev.tanggal,
        lokasi: ev.lokasi,
        bg_url: ev.sertifikat_bg_url,
        dokumentasi_url: ev.dokumentasi_url,
        diterbitkan_oleh: olehNama,
      });
    });
  }
  if (rows.length === 0) return 0;

  const { error: e3 } = await s.from('sertifikat').upsert(rows, { onConflict: 'event_id,anak_id' });
  if (e3) throw new Error(e3.message);

  revalidatePath('/pilih-anak');
  return rows.length;
}

export async function hapusSertifikat(id: string): Promise<void> {
  const { s } = await adminDb();
  const { error } = await s.from('sertifikat').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak');
}
