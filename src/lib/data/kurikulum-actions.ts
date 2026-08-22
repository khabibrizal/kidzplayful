// src/lib/data/kurikulum-actions.ts — simpan checklist evaluasi satu tema untuk satu anak.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ButirEvaluasiTersimpan } from '@/lib/game/tipe';
import { susunHasilEvaluasi } from '@/lib/domain/kurikulum';

type Peran = 'ortu' | 'guru' | 'psikolog' | 'admin';

/**
 * Menyimpan seluruh checklist sebuah tema (satu baris per anak+tema+peran).
 *
 * Kalimat butirnya diambil ULANG dari materi di server; klien hanya menyebut **aktivitas
 * ke-i, butir ke-j** yang dicentang. Tanpa itu, siapa pun bisa menuliskan kalimat evaluasi
 * karangan sendiri ke rapor anaknya — dan rapor adalah dokumen yang ditunjukkan ke orang
 * lain, jadi isinya harus berasal dari materi, bukan dari browser.
 *
 * Perannya juga ditentukan SERVER dari profil penyimpan: klien tak boleh mengaku "guru".
 */
export async function simpanEvaluasi(
  anakId: string, kelasId: string, dicentang: Record<string, number[]>, catatan?: string,
): Promise<{ ok: boolean; error?: string; tercapai?: number; total?: number; peran?: Peran }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };

    const [{ data: anak }, { data: kelas }, { data: prof }] = await Promise.all([
      s.from('anak').select('id,ortu_id').eq('id', anakId).maybeSingle(),
      s.from('kelas_bermain').select('aktivitas').eq('id', kelasId).maybeSingle(),
      s.from('profiles').select('is_admin,is_superuser,is_guru,is_psikolog,nama_tampilan,email')
        .eq('id', user.id).maybeSingle(),
    ]);
    if (!anak) return { ok: false, error: 'Anak tidak ditemukan.' };
    if (!kelas) return { ok: false, error: 'Materi tidak ditemukan.' };

    // Orang tua pemilik dinilai lebih dulu: seorang admin yang menilai anaknya sendiri
    // tetap tercatat sebagai 'ortu', karena itulah kebenarannya di mata pembaca rapor.
    const milikSendiri = anak.ortu_id === user.id;
    const peran: Peran | null = milikSendiri ? 'ortu'
      : prof?.is_guru ? 'guru'
        : prof?.is_psikolog ? 'psikolog'
          : (prof?.is_admin || prof?.is_superuser) ? 'admin' : null;
    if (!peran) return { ok: false, error: 'Anda tidak berhak menilai anak ini.' };

    // Aturannya (snapshot kalimat dari materi, indeks asing diabaikan) tinggal di domain
    // dan diuji di sana — action ini hanya menyediakan bahannya.
    const aktivitas = (kelas.aktivitas as { judul?: string; evaluasi?: string[] }[]) ?? [];
    const hasil: ButirEvaluasiTersimpan[] = susunHasilEvaluasi(aktivitas, dicentang);
    if (hasil.length === 0) return { ok: false, error: 'Materi ini belum punya butir evaluasi.' };

    const oleh = (prof?.nama_tampilan as string | null)?.trim() || (prof?.email as string | null) || null;
    const { error } = await s.from('evaluasi_kurikulum').upsert({
      anak_id: anakId, ortu_id: anak.ortu_id as string, kelas_id: kelasId,
      hasil, catatan: catatan?.trim() || null, dinilai_oleh: oleh, peran,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'anak_id,kelas_id,peran' });
    if (error) {
      // Tabelnya belum ada (0098 belum dijalankan) → katakan apa yang harus dilakukan,
      // jangan menyodorkan pesan Postgres mentah ke orang tua.
      if (error.code === '42P01') {
        return { ok: false, error: 'Fitur evaluasi belum aktif di server (migrasi 0098 belum dijalankan).' };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath(`/anak/${anakId}/laporan`);
    revalidatePath('/kelas-saya');
    revalidatePath(`/kelas/${kelasId}`);
    return { ok: true, tercapai: hasil.filter((h) => h.tercapai).length, total: hasil.length, peran };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan evaluasi.' };
  }
}
