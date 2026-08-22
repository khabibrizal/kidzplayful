// src/lib/data/catatan-tema-actions.ts — tulis catatan perkembangan per tema.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { NilaiTema } from './catatan-tema';

/**
 * Simpan / perbarui catatan tema.
 *
 * Perannya DITENTUKAN SERVER dari profil penulis — klien tak boleh mengaku "psikolog",
 * sebab rapor menampilkan peran itu sebagai keterangan siapa yang menilai. `penulis_id`
 * pun selalu `auth.uid()`, jadi menyimpan ulang hanya menimpa catatan miliknya sendiri
 * (kunci unik 0099 = anak+kelas+penulis).
 */
export async function simpanCatatanTema(input: {
  anakId: string; kelasId: string; catatan: string; penilaian?: NilaiTema[];
}): Promise<{ ok: boolean; error?: string; peran?: string }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };

    const isi = (input.catatan ?? '').trim();
    // Catatan kosong ditolak: baris tanpa isi di rapor hanya menambah kebisingan, dan
    // orang tua akan mengira gurunya menulis sesuatu.
    if (!isi) return { ok: false, error: 'Catatan tidak boleh kosong.' };

    const { data: prof } = await s.from('profiles')
      .select('is_admin,is_superuser,is_guru,is_psikolog').eq('id', user.id).maybeSingle();
    // Urutannya: guru → psikolog → admin. Seorang admin yang juga guru dicatat sebagai
    // GURU, karena itulah kapasitas yang relevan saat menilai anak.
    const peran = prof?.is_guru ? 'guru'
      : prof?.is_psikolog ? 'psikolog'
        : (prof?.is_admin || prof?.is_superuser) ? 'admin' : null;
    if (!peran) return { ok: false, error: 'Hanya admin, guru, atau psikolog yang boleh menulis catatan tema.' };

    // Penilaian dibersihkan: baris tanpa indikator/nilai tak berarti apa-apa di rapor.
    const penilaian = (input.penilaian ?? [])
      .map((n) => ({ area: (n.area ?? '').trim(), indikator: (n.indikator ?? '').trim(), nilai: (n.nilai ?? '').trim() }))
      .filter((n) => n.indikator && n.nilai);

    const { error } = await s.from('catatan_tema').upsert({
      anak_id: input.anakId, kelas_id: input.kelasId, penulis_id: user.id, peran,
      penilaian, catatan: isi, updated_at: new Date().toISOString(),
    }, { onConflict: 'anak_id,kelas_id,penulis_id' });
    if (error) {
      if (error.code === '42P01') {
        return { ok: false, error: 'Fitur catatan tema belum aktif di server (migrasi 0099 belum dijalankan).' };
      }
      // 42501 = ditolak RLS. Untuk psikolog, sebabnya hampir selalu sama: anak itu belum
      // pernah konsultasi dengannya (0066), jadi katakan itu ketimbang "permission denied".
      if (error.code === '42501') {
        return { ok: false, error: 'Anda tidak berhak menulis catatan untuk anak ini. Psikolog hanya bisa menilai anak yang pernah konsultasi dengannya.' };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath('/catatan-tema');
    revalidatePath(`/anak/${input.anakId}/laporan`);
    return { ok: true, peran };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan catatan.' };
  }
}
