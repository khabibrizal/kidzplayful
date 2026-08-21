// src/lib/data/langganan-anak-actions.ts — admin menetapkan paket & periode PER ANAK.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

/**
 * Aktifkan / perpanjang langganan seorang anak selama `bulan` bulan.
 *
 * Perpanjangan dihitung dari **max(hari ini, aktif_sampai)** — BUKAN dari hari ini. Perilaku
 * lama `aktifkanLangganan` menyetel `hari ini + 1 bulan`, sehingga orang tua yang membayar
 * lebih awal KEHILANGAN sisa harinya. Dengan langganan per anak, kekeliruan itu akan sering
 * terasa dan langsung terbaca sebagai kecurangan.
 */
export async function setPaketAnak(
  anakId: string, paketId: string, bulan = 1,
): Promise<{ ok: boolean; error?: string; aktifSampai?: string }> {
  try {
    const s = await adminDb();
    const { data: anak } = await s.from('anak').select('id,ortu_id').eq('id', anakId).maybeSingle();
    if (!anak) return { ok: false, error: 'Anak tidak ditemukan.' };

    const { data: lama, error: eBaca } = await s.from('langganan_anak')
      .select('aktif_sampai').eq('anak_id', anakId).maybeSingle();
    if (eBaca) return { ok: false, error: 'Tabel langganan per anak belum ada — jalankan migrasi 0089 dulu.' };

    const hariIni = new Date();
    const dasar = lama?.aktif_sampai ? new Date((lama.aktif_sampai as string) + 'T00:00:00Z') : hariIni;
    const mulai = dasar > hariIni ? dasar : hariIni;
    const sampai = new Date(mulai);
    sampai.setMonth(sampai.getMonth() + Math.max(1, Math.floor(bulan)));
    const aktifSampai = sampai.toISOString().slice(0, 10);

    const { error } = await s.from('langganan_anak').upsert({
      anak_id: anakId, ortu_id: anak.ortu_id as string, paket_id: paketId,
      aktif_sampai: aktifSampai, updated_at: new Date().toISOString(),
    }, { onConflict: 'anak_id' });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/admin/langganan'); revalidatePath('/pilih-anak');
    return { ok: true, aktifSampai };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menetapkan paket.' };
  }
}

/** Hentikan langganan seorang anak (periode diakhiri hari ini). */
export async function hentikanPaketAnak(anakId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const { error } = await s.from('langganan_anak')
      .update({ aktif_sampai: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
      .eq('anak_id', anakId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/langganan'); revalidatePath('/pilih-anak');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' };
  }
}
